import { describe, it, expect, afterEach, vi } from "vitest";
import { encrypt, decrypt, getEncryptionSalt } from "@/lib/crypto";
import { decryptValue } from "@/lib/nodes/utils";

const SECRET = "test-encryption-secret";

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
