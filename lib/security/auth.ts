/**
 * Local auth hardening primitives.
 *
 * Sooket has no user accounts — the management surface is normally protected
 * only by being bound to loopback. These helpers add two opt-in/always-on
 * defenses without introducing a login system:
 *
 *   1. `warnIfExposedWithoutAuth()` — a loud startup warning when the server is
 *      bound to a non-loopback interface and no shared secret is configured.
 *   2. The shared-secret gate (`SOOKET_AUTH_TOKEN`) used by `proxy.ts`:
 *      `isAuthorized()` + `isPublicPath()` decide whether a request may pass.
 *
 * This module is intentionally framework-agnostic (no Next.js, no `server-only`,
 * no DB) so it can be imported by `proxy.ts`, `instrumentation.ts`, the
 * standalone execution server, and unit tests alike.
 */
import { timingSafeEqual } from "node:crypto";

/** Name of the httpOnly cookie that carries the shared secret for the browser. */
export const AUTH_COOKIE = "sooket_auth";

/**
 * True when `host` refers to the local machine only (loopback). Anything else —
 * `0.0.0.0`, `::`, a LAN/public IP, or a hostname — is treated as network-exposed.
 */
export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === "localhost" || h === "::1" || h === "[::1]") return true;
  // 127.0.0.0/8 is entirely loopback.
  if (h === "127.0.0.1" || h.startsWith("127.")) return true;
  return false;
}

/** Resolve the configured bind host the same way the launchers do (empty → loopback). */
export function resolveHost(): string {
  return process.env.SOOKET_HOST?.trim() || "127.0.0.1";
}

/** The shared secret, or null when the feature is disabled (unset/empty). */
export function resolveAuthToken(): string | null {
  return process.env.SOOKET_AUTH_TOKEN?.trim() || null;
}

/**
 * Constant-time string comparison. Returns false on any length mismatch (the
 * length difference is not itself secret) and never throws on bad input.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Print a loud, unmissable warning when the server is reachable from the network
 * without the shared-secret gate enabled. No-op for the safe configurations
 * (loopback bind, or a token is set). Reads the environment at call time.
 */
export function warnIfExposedWithoutAuth(): void {
  const host = resolveHost();
  if (isLoopbackHost(host)) return; // localhost-only — not reachable from the network
  if (resolveAuthToken()) return; // gate is enabled — protected

  const line = "═".repeat(72);
  console.warn(
    `\n${line}\n` +
      `  ⚠  SECURITY WARNING — Sooket is exposed without authentication\n` +
      `${line}\n` +
      `  The server is bound to ${host} (reachable from the network), but no\n` +
      `  SOOKET_AUTH_TOKEN is set. Sooket's management API has NO auth: anyone\n` +
      `  who can reach this host can read/modify workflows, mint API keys, and\n` +
      `  download the database.\n\n` +
      `  Fix one of the following:\n` +
      `    • Set SOOKET_AUTH_TOKEN=<a-long-random-secret> to gate the dashboard\n` +
      `      and management API, OR\n` +
      `    • Bind to loopback only (unset SOOKET_HOST / use 127.0.0.1) and put an\n` +
      `      authenticating reverse proxy in front of it.\n` +
      `${line}\n`,
  );
}

/**
 * Paths that must remain reachable even when the shared-secret gate is on:
 *   - `/api/v1/*` and `/api/webhooks/*` carry their own per-key/token auth and
 *     are the public-facing execution surface.
 *   - `/api/health` is an unauthenticated liveness probe by design.
 *   - the unlock page + its action must be reachable to obtain access.
 */
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/api/health") return true;
  if (pathname === "/api/v1/chat" || pathname.startsWith("/api/v1/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname === "/unlock" || pathname === "/api/unlock") return true;
  return false;
}

/**
 * Decide whether a gated request is authorized against the shared secret.
 * Accepts either an `Authorization: Bearer <token>` header (programmatic
 * callers) or the value of the `sooket_auth` cookie (the browser dashboard).
 */
export function isAuthorized(
  token: string,
  authHeader: string | null,
  cookieValue: string | null,
): boolean {
  if (authHeader) {
    const trimmed = authHeader.trim();
    const provided = trimmed.toLowerCase().startsWith("bearer ")
      ? trimmed.slice(7).trim()
      : trimmed;
    if (provided && safeEqual(provided, token)) return true;
  }
  if (cookieValue && safeEqual(cookieValue, token)) return true;
  return false;
}
