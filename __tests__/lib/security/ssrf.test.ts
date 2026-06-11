import { describe, it, expect, afterEach, vi } from "vitest";
import {
  assertEgressAllowed,
  isBlockedAddress,
  privateEgressAllowed,
  BlockedEgressError,
  type EgressLookup,
} from "@/lib/security/ssrf";

/** A resolver that maps each hostname to fixed addresses. */
function fakeLookup(map: Record<string, Array<{ address: string; family: number }>>): EgressLookup {
  return async (host: string) => {
    if (host in map) return map[host];
    throw new Error(`ENOTFOUND ${host}`);
  };
}

const publicLookup = fakeLookup({ "api.example.com": [{ address: "93.184.216.34", family: 4 }] });

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── isBlockedAddress ─────────────────────────────────────────────────────────

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",      // CGNAT
    "0.0.0.0",
  ])("blocks private/reserved IPv4 %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "1.1.1.1", "172.32.0.1"])(
    "allows public IPv4 %s",
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    },
  );

  it.each(["::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1"])(
    "blocks loopback/link-local/ULA/IPv4-mapped IPv6 %s",
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    },
  );

  it("allows public IPv6", () => {
    expect(isBlockedAddress("2607:f8b0:4005:80a::200e")).toBe(false);
  });

  it("returns false for a non-IP string (resolved separately)", () => {
    expect(isBlockedAddress("example.com")).toBe(false);
  });
});

// ─── assertEgressAllowed ──────────────────────────────────────────────────────

describe("assertEgressAllowed", () => {
  it("allows a public hostname that resolves to a public IP", async () => {
    await expect(assertEgressAllowed("https://api.example.com/v1", publicLookup)).resolves.toBeUndefined();
  });

  it("allows a public IP literal without resolving", async () => {
    await expect(assertEgressAllowed("https://93.184.216.34/", publicLookup)).resolves.toBeUndefined();
  });

  it.each([
    ["loopback IP", "http://127.0.0.1/admin"],
    ["metadata IP", "http://169.254.169.254/latest/meta-data/"],
    ["private 10/8", "http://10.0.0.5:8080/"],
    ["private 192.168", "https://192.168.1.1/"],
    ["IPv6 loopback", "http://[::1]:9000/"],
    ["IPv6 link-local", "http://[fe80::1]/"],
  ])("blocks %s", async (_name, url) => {
    await expect(assertEgressAllowed(url, publicLookup)).rejects.toBeInstanceOf(BlockedEgressError);
  });

  it("blocks the literal hostname 'localhost'", async () => {
    await expect(assertEgressAllowed("http://localhost:3000/", publicLookup)).rejects.toThrow(/loopback host/);
  });

  it("blocks a hostname that RESOLVES to a private address (DNS-based SSRF)", async () => {
    const lookup = fakeLookup({ "internal.attacker.test": [{ address: "169.254.169.254", family: 4 }] });
    await expect(assertEgressAllowed("https://internal.attacker.test/", lookup)).rejects.toThrow(
      /resolves to private or reserved address/,
    );
  });

  it("blocks when ANY resolved address is private (multi-record host)", async () => {
    const lookup = fakeLookup({
      "mixed.test": [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.9", family: 4 },
      ],
    });
    await expect(assertEgressAllowed("https://mixed.test/", lookup)).rejects.toThrow(/10\.0\.0\.9/);
  });

  it("fails closed when the host cannot be resolved", async () => {
    await expect(assertEgressAllowed("https://does-not-resolve.test/", publicLookup)).rejects.toThrow(
      /could not resolve host/,
    );
  });

  it.each(["file:///etc/passwd", "ftp://example.com/x", "gopher://127.0.0.1/"])(
    "blocks non-http(s) protocol %s",
    async (url) => {
      await expect(assertEgressAllowed(url, publicLookup)).rejects.toThrow(/disallowed protocol/);
    },
  );

  it("blocks a malformed URL", async () => {
    await expect(assertEgressAllowed("not a url", publicLookup)).rejects.toThrow(/not a valid URL/);
  });

  it("the thrown error carries the host and reason", async () => {
    const err = await assertEgressAllowed("http://127.0.0.1/", publicLookup).catch((e) => e);
    expect(err).toBeInstanceOf(BlockedEgressError);
    expect(err.host).toBe("127.0.0.1");
    expect(err.reason).toMatch(/private or reserved/);
  });
});

// ─── opt-out ──────────────────────────────────────────────────────────────────

describe("SOOKET_ALLOW_PRIVATE_EGRESS opt-out", () => {
  it.each(["1", "true", "yes", "on"])("privateEgressAllowed() is true for %s", (v) => {
    vi.stubEnv("SOOKET_ALLOW_PRIVATE_EGRESS", v);
    expect(privateEgressAllowed()).toBe(true);
  });

  it("is false when unset or empty", () => {
    vi.stubEnv("SOOKET_ALLOW_PRIVATE_EGRESS", "");
    expect(privateEgressAllowed()).toBe(false);
  });

  it("permits an otherwise-blocked target when enabled", async () => {
    vi.stubEnv("SOOKET_ALLOW_PRIVATE_EGRESS", "1");
    await expect(assertEgressAllowed("http://169.254.169.254/", publicLookup)).resolves.toBeUndefined();
  });
});
