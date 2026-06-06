const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

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
 * Derives the AES-GCM key from `secret` via PBKDF2 (100k iterations, SHA-256,
 * salt from {@link getEncryptionSalt}). The key carries both `encrypt` and
 * `decrypt` usages so it serves callers that only decrypt (e.g.
 * `lib/nodes/utils.ts`) as well as the encrypt path here. This is the single
 * source of truth for key derivation — do not reimplement it elsewhere.
 */
export async function deriveKey(secret: string): Promise<CryptoKey> {
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
      salt: encoder.encode(getEncryptionSalt()),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
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
  const key = await deriveKey(secret);
  const combined = hexToBytes(ciphertextHex);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}
