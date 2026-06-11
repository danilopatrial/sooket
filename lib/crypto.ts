const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

/**
 * PBKDF2 iteration counts. `PBKDF2_ITERATIONS` is the current strength used for
 * all *new* encryptions (OWASP's 2023 floor for PBKDF2-HMAC-SHA256).
 * `LEGACY_PBKDF2_ITERATIONS` is the pre-2026-06 strength: `decrypt` falls back
 * to it so data written before the bump still reads. Because the derived key is
 * memoised, raising the count does not add per-operation cost — derivation
 * happens once per (iterations, salt, secret) for the life of the process.
 */
export const PBKDF2_ITERATIONS = 600_000;
export const LEGACY_PBKDF2_ITERATIONS = 100_000;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Resolves the PBKDF2 salt. Defaults to "sooket-salt" for backwards
 * compatibility with data encrypted before ENCRYPTION_SALT existed; set
 * ENCRYPTION_SALT to a deployment-unique value so two installs that happen to
 * share an ENCRYPTION_SECRET do not derive the same key from it. An empty or
 * unset value falls back to the legacy default.
 */
export function getEncryptionSalt(): string {
  return process.env.ENCRYPTION_SALT || "sooket-salt";
}

/**
 * Memoised derived keys, keyed by (iterations, salt, secret). PBKDF2 is
 * deliberately expensive, so re-deriving on every encrypt/decrypt was both a
 * hot-path latency tax (each customer variable was decrypted with a fresh
 * derivation per request) and a CPU-DoS amplifier. The derived `CryptoKey` is
 * non-extractable, so caching it exposes nothing the process secret didn't
 * already. The Promise (not the resolved key) is cached so concurrent callers
 * share one in-flight derivation rather than stampeding.
 */
const keyCache = new Map<string, Promise<CryptoKey>>();

/**
 * Derives the AES-GCM key from `secret` via PBKDF2 (SHA-256, salt from
 * {@link getEncryptionSalt}, `iterations` PBKDF2 rounds — defaults to the
 * current {@link PBKDF2_ITERATIONS}). The key carries both `encrypt` and
 * `decrypt` usages so it serves decrypt-only callers (e.g. `lib/nodes/utils.ts`)
 * as well as the encrypt path here. This is the single source of truth for key
 * derivation — do not reimplement it elsewhere. Results are memoised; the salt
 * is part of the cache key so a salt change still derives a distinct key.
 */
export async function deriveKey(
  secret: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const salt = getEncryptionSalt();
  const cacheKey = JSON.stringify([iterations, salt, secret]);
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(salt),
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ["encrypt", "decrypt"]
    );
  })();

  keyCache.set(cacheKey, promise);
  return promise;
}

export async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret, PBKDF2_ITERATIONS);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bytesToHex(combined);
}

export async function decrypt(ciphertextHex: string, secret: string): Promise<string> {
  const combined = hexToBytes(ciphertextHex);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  // The ciphertext format carries no iteration marker, so try the current
  // strength first and fall back to the legacy one for data written before the
  // bump. Derivations are cached, so the fallback costs only an extra (cheap)
  // GCM attempt, not an extra key derivation, once each key is warm.
  const attempts = [PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS];
  for (let i = 0; i < attempts.length; i++) {
    try {
      const key = await deriveKey(secret, attempts[i]);
      const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
      return new TextDecoder().decode(plaintext);
    } catch (err) {
      // Only the final attempt's failure is real (wrong secret/salt or corrupt
      // data); earlier failures just mean "not encrypted at this strength".
      if (i === attempts.length - 1) throw err;
    }
  }
  // Unreachable: the loop either returns or throws on the last attempt.
  throw new Error("decryption failed");
}
