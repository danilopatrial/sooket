import { createHash } from "node:crypto";

/**
 * Hashing for `sk-wf-*` / `sk-mw-*` style API keys stored at rest.
 *
 * These keys are high-entropy random tokens (`sk-wf-` + a 122-bit UUID with the
 * dashes stripped), not user-chosen passwords. They are not brute-forceable, so
 * a fast cryptographic hash is the right tool — the same approach GitHub, Stripe
 * and others use for token storage. A slow KDF (PBKDF2/argon) buys nothing here
 * and would add latency to every authenticated request; a per-key salt would
 * also defeat the O(1) "look the key up by its hash" lookup the auth path needs.
 *
 * Only the hash and a non-secret display prefix are persisted. The raw key is
 * shown to the caller exactly once, at creation, and is unrecoverable after —
 * a database (or backup file) leak no longer exposes usable credentials.
 */

/** SHA-256 hex digest of a raw API key — the value stored in `key_hash`. */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/**
 * Non-secret, human-readable hint stored alongside the hash so the UI can show
 * which key a row is without ever holding the secret. Mirrors the historical
 * `maskKey` shape: first 10 chars + last 4 (e.g. `sk-wf-1a2b...ef90`). Short
 * keys (<= 10 chars) are returned unchanged — they carry no recoverable secret
 * at that length and only the seeded/legacy values are ever that short.
 */
export function deriveKeyPrefix(rawKey: string): string {
  if (rawKey.length <= 10) return rawKey;
  return `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
}
