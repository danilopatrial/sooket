/**
 * SSRF egress guard for nodes that fetch user-controlled URLs (HTTP Request,
 * Webhook action). Without this, a workflow author — or anyone who can inject a
 * URL via a request body under the shared-secret multi-caller mode — could make
 * the server fetch internal targets: cloud metadata (169.254.169.254), loopback
 * admin ports, or RFC1918 services.
 *
 * The guard parses the URL, requires http/https, and blocks any host that is (or
 * resolves to) a private/reserved IP. Hostnames are resolved and *every* returned
 * address is checked, so `evil.example` → 169.254.169.254 is caught, not just IP
 * literals. This is not a perfect defense against DNS rebinding (a TOCTOU window
 * remains between this check and the socket connect), but it closes the common
 * SSRF vectors. Self-hosted installs that legitimately call internal services can
 * opt out with `SOOKET_ALLOW_PRIVATE_EGRESS=1`.
 *
 * Framework-agnostic (no Next.js / DB) so nodes and tests can import it freely.
 */
import { BlockList, isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

/** Thrown when a URL is disallowed by the egress policy. */
export class BlockedEgressError extends Error {
  readonly host: string;
  readonly reason: string;
  constructor(host: string, reason: string) {
    super(`Blocked egress to "${host}": ${reason}`);
    this.name = "BlockedEgressError";
    this.host = host;
    this.reason = reason;
  }
}

/** A DNS resolver shape; injectable so tests need no real network. */
export type EgressLookup = (host: string) => Promise<Array<{ address: string; family: number }>>;

const defaultLookup: EgressLookup = (host) => dnsLookup(host, { all: true });

/** Build the set of private/reserved ranges that must never be fetched. */
function buildBlockList(): BlockList {
  const bl = new BlockList();
  // IPv4 — private, loopback, link-local (incl. cloud metadata), CGNAT, reserved.
  bl.addSubnet("0.0.0.0", 8, "ipv4");
  bl.addSubnet("10.0.0.0", 8, "ipv4");
  bl.addSubnet("100.64.0.0", 10, "ipv4");
  bl.addSubnet("127.0.0.0", 8, "ipv4");
  bl.addSubnet("169.254.0.0", 16, "ipv4");
  bl.addSubnet("172.16.0.0", 12, "ipv4");
  bl.addSubnet("192.0.0.0", 24, "ipv4");
  bl.addSubnet("192.0.2.0", 24, "ipv4");
  bl.addSubnet("192.88.99.0", 24, "ipv4");
  bl.addSubnet("192.168.0.0", 16, "ipv4");
  bl.addSubnet("198.18.0.0", 15, "ipv4");
  bl.addSubnet("198.51.100.0", 24, "ipv4");
  bl.addSubnet("203.0.113.0", 24, "ipv4");
  bl.addSubnet("224.0.0.0", 4, "ipv4");
  bl.addSubnet("240.0.0.0", 4, "ipv4");
  // IPv6 — loopback, unspecified, unique-local, link-local, multicast.
  // (BlockList maps IPv4-mapped addresses like ::ffff:127.0.0.1 onto the IPv4
  // rules above automatically when checked as ipv6.)
  bl.addAddress("::1", "ipv6");
  bl.addAddress("::", "ipv6");
  bl.addSubnet("fc00::", 7, "ipv6");
  bl.addSubnet("fe80::", 10, "ipv6");
  bl.addSubnet("ff00::", 8, "ipv6");
  return bl;
}

const blockList = buildBlockList();

/** True when `SOOKET_ALLOW_PRIVATE_EGRESS` opts out of the guard. */
export function privateEgressAllowed(): boolean {
  const v = process.env.SOOKET_ALLOW_PRIVATE_EGRESS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** True when `ip` (an IPv4 or IPv6 literal) falls in a blocked range. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return blockList.check(ip, "ipv4");
  if (family === 6) return blockList.check(ip, "ipv6");
  return false; // not an IP literal — caller resolves it first
}

/**
 * Throws {@link BlockedEgressError} if `rawUrl` is not safe to fetch:
 *   - not a valid URL, or not http/https
 *   - an IP literal in a private/reserved range
 *   - a hostname that resolves to any private/reserved address (fail-closed if
 *     it cannot be resolved)
 * No-op when `SOOKET_ALLOW_PRIVATE_EGRESS` is set.
 */
export async function assertEgressAllowed(rawUrl: string, lookup: EgressLookup = defaultLookup): Promise<void> {
  if (privateEgressAllowed()) return;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedEgressError(rawUrl, "not a valid URL");
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    throw new BlockedEgressError(url.host || rawUrl, `disallowed protocol "${protocol}"`);
  }

  // URL.hostname keeps brackets around IPv6 literals (e.g. "[::1]"); strip them.
  let host = url.hostname;
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);

  const lowerHost = host.toLowerCase();
  if (lowerHost === "localhost" || lowerHost.endsWith(".localhost")) {
    throw new BlockedEgressError(host, "loopback host");
  }

  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new BlockedEgressError(host, "private or reserved address");
    return;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(host);
  } catch {
    // Fail closed: if we cannot verify where the host points, do not fetch it.
    throw new BlockedEgressError(host, "could not resolve host");
  }
  if (addresses.length === 0) throw new BlockedEgressError(host, "host resolved to no addresses");

  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new BlockedEgressError(host, `resolves to private or reserved address ${address}`);
    }
  }
}
