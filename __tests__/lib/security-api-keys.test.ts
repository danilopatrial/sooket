import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { hashApiKey, deriveKeyPrefix } from "@/lib/security/api-keys";

describe("hashApiKey", () => {
  it("produces the SHA-256 hex digest of the raw key", () => {
    const raw = "sk-wf-abc123";
    const expected = createHash("sha256").update(raw, "utf8").digest("hex");
    expect(hashApiKey(raw)).toBe(expected);
  });

  it("is a 64-char lowercase hex string", () => {
    expect(hashApiKey("sk-wf-anything")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashApiKey("sk-wf-stable")).toBe(hashApiKey("sk-wf-stable"));
  });

  it("differs for different inputs (no collisions on close values)", () => {
    expect(hashApiKey("sk-wf-aaaa")).not.toBe(hashApiKey("sk-wf-aaab"));
  });

  it("never returns the raw key (the secret is not recoverable from storage)", () => {
    const raw = "sk-wf-supersecret";
    expect(hashApiKey(raw)).not.toContain("supersecret");
  });

  it("handles the empty string without throwing", () => {
    expect(hashApiKey("")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("deriveKeyPrefix", () => {
  it("keeps the first 10 and last 4 chars for a full-length key", () => {
    const raw = "sk-wf-1234567890abcdef";
    expect(deriveKeyPrefix(raw)).toBe("sk-wf-1234...cdef");
  });

  it("returns short keys (<= 10 chars) unchanged", () => {
    expect(deriveKeyPrefix("short")).toBe("short");
    expect(deriveKeyPrefix("tenchars10")).toBe("tenchars10");
  });

  it("contains no middle characters of the secret", () => {
    const raw = "sk-wf-MIDDLEsecretPORTIONxyz9";
    const prefix = deriveKeyPrefix(raw);
    expect(prefix).not.toContain("MIDDLEsecretPORTION");
    expect(prefix.startsWith("sk-wf-MIDD")).toBe(true);
    expect(prefix.endsWith("xyz9")).toBe(true);
  });
});
