import { describe, it, expect, afterEach, vi } from "vitest";
import {
  encrypt,
  decrypt,
  deriveKey,
  getEncryptionSalt,
  PBKDF2_ITERATIONS,
  LEGACY_PBKDF2_ITERATIONS,
} from "@/lib/crypto";
import { decryptValue } from "@/lib/nodes/utils";

const SECRET = "test-encryption-secret";

/** Manually produce ciphertext at a chosen PBKDF2 strength (mirrors crypto.encrypt). */
async function encryptAt(plaintext: string, secret: string, iterations: number): Promise<string> {
  const key = await deriveKey(secret, iterations);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return Array.from(combined).map((b) => b.toString(16).padStart(2, "0")).join("");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── getEncryptionSalt ────────────────────────────────────────────────────────

describe("getEncryptionSalt", () => {
  it("defaults to 'sooket-salt' when ENCRYPTION_SALT is unset", () => {
    vi.stubEnv("ENCRYPTION_SALT", undefined as unknown as string);
    expect(getEncryptionSalt()).toBe("sooket-salt");
  });

  it("falls back to 'sooket-salt' when ENCRYPTION_SALT is an empty string", () => {
    vi.stubEnv("ENCRYPTION_SALT", "");
    expect(getEncryptionSalt()).toBe("sooket-salt");
  });

  it("uses ENCRYPTION_SALT when set to a non-empty value", () => {
    vi.stubEnv("ENCRYPTION_SALT", "deployment-unique-salt");
    expect(getEncryptionSalt()).toBe("deployment-unique-salt");
  });
});

// ─── encrypt / decrypt round-trip ─────────────────────────────────────────────

describe("encrypt / decrypt", () => {
  it("round-trips a plaintext with the default salt", async () => {
    const ct = await encrypt("hello world", SECRET);
    expect(await decrypt(ct, SECRET)).toBe("hello world");
  });

  it("round-trips an empty string", async () => {
    const ct = await encrypt("", SECRET);
    expect(await decrypt(ct, SECRET)).toBe("");
  });

  it("round-trips unicode content", async () => {
    const ct = await encrypt("héllo · 世界 · 🔐", SECRET);
    expect(await decrypt(ct, SECRET)).toBe("héllo · 世界 · 🔐");
  });

  it("prepends a 12-byte IV (24 hex chars) and is lowercase hex", async () => {
    const ct = await encrypt("x", SECRET);
    expect(ct).toMatch(/^[0-9a-f]+$/);
    expect(ct.length).toBeGreaterThan(24); // 12-byte IV + at least some ciphertext
  });

  it("produces different ciphertext each call (random IV)", async () => {
    const a = await encrypt("same", SECRET);
    const b = await encrypt("same", SECRET);
    expect(a).not.toBe(b);
  });

  it("round-trips with a custom ENCRYPTION_SALT", async () => {
    vi.stubEnv("ENCRYPTION_SALT", "deployment-unique-salt");
    const ct = await encrypt("secret-value", SECRET);
    expect(await decrypt(ct, SECRET)).toBe("secret-value");
  });

  it("cannot decrypt across two different salts", async () => {
    vi.stubEnv("ENCRYPTION_SALT", "salt-A");
    const ct = await encrypt("cross-salt", SECRET);
    vi.stubEnv("ENCRYPTION_SALT", "salt-B");
    await expect(decrypt(ct, SECRET)).rejects.toThrow();
  });
});

// ─── cross-module consistency (crypto.ts ⇄ nodes/utils.ts) ─────────────────────

describe("decryptValue (lib/nodes/utils) matches crypto.encrypt", () => {
  it("decrypts ciphertext produced by crypto.encrypt under the default salt", async () => {
    const ct = await encrypt("provider-key-abc", SECRET);
    expect(await decryptValue(ct, SECRET)).toBe("provider-key-abc");
  });

  it("decrypts under a shared custom ENCRYPTION_SALT", async () => {
    vi.stubEnv("ENCRYPTION_SALT", "shared-deployment-salt");
    const ct = await encrypt("provider-key-xyz", SECRET);
    expect(await decryptValue(ct, SECRET)).toBe("provider-key-xyz");
  });
});

// ─── PBKDF2 iterations: strength + backward compatibility ─────────────────────

describe("PBKDF2 iterations", () => {
  it("uses the hardened default and keeps the legacy constant for fallback", () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000);
    expect(LEGACY_PBKDF2_ITERATIONS).toBe(100_000);
    expect(PBKDF2_ITERATIONS).toBeGreaterThan(LEGACY_PBKDF2_ITERATIONS);
  });

  it("decrypts legacy ciphertext written at the old 100k strength (no data loss after the bump)", async () => {
    const legacyCt = await encryptAt("legacy-secret", SECRET, LEGACY_PBKDF2_ITERATIONS);
    expect(await decrypt(legacyCt, SECRET)).toBe("legacy-secret");
    // and via the runtime path used by the engine
    expect(await decryptValue(legacyCt, SECRET)).toBe("legacy-secret");
  });

  it("decrypts current-strength ciphertext at 600k", async () => {
    const ct = await encryptAt("new-secret", SECRET, PBKDF2_ITERATIONS);
    expect(await decrypt(ct, SECRET)).toBe("new-secret");
  });

  it("a wrong secret still fails after trying both strengths", async () => {
    const ct = await encrypt("sensitive", SECRET);
    await expect(decrypt(ct, "the-wrong-secret")).rejects.toThrow();
  });
});

// ─── key derivation memoisation ───────────────────────────────────────────────

describe("deriveKey memoisation", () => {
  it("returns the identical CryptoKey instance for the same (secret, salt, iterations)", async () => {
    vi.stubEnv("ENCRYPTION_SALT", "cache-salt-1");
    const a = await deriveKey("cache-secret", PBKDF2_ITERATIONS);
    const b = await deriveKey("cache-secret", PBKDF2_ITERATIONS);
    expect(a).toBe(b); // same object → derivation was reused, not recomputed
  });

  it("derives a distinct key when the salt changes (salt is part of the cache key)", async () => {
    vi.stubEnv("ENCRYPTION_SALT", "cache-salt-A");
    const a = await deriveKey("cache-secret-2", PBKDF2_ITERATIONS);
    vi.stubEnv("ENCRYPTION_SALT", "cache-salt-B");
    const b = await deriveKey("cache-secret-2", PBKDF2_ITERATIONS);
    expect(a).not.toBe(b);
  });

  it("derives a distinct key per iteration count", async () => {
    vi.stubEnv("ENCRYPTION_SALT", "cache-salt-iter");
    const current = await deriveKey("cache-secret-3", PBKDF2_ITERATIONS);
    const legacy = await deriveKey("cache-secret-3", LEGACY_PBKDF2_ITERATIONS);
    expect(current).not.toBe(legacy);
  });
});
