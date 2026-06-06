import { describe, it, expect } from "vitest";
import { truncatePayload, MAX_SNAPSHOT_BYTES } from "@/lib/node-trace";

describe("truncatePayload", () => {
  it("serializes null to the string 'null'", () => {
    expect(truncatePayload(null)).toBe("null");
  });

  it("serializes undefined to the string 'null'", () => {
    expect(truncatePayload(undefined)).toBe("null");
  });

  it("serializes a number", () => {
    expect(truncatePayload(42)).toBe("42");
  });

  it("serializes a boolean", () => {
    expect(truncatePayload(true)).toBe("true");
    expect(truncatePayload(false)).toBe("false");
  });

  it("serializes a plain string", () => {
    expect(truncatePayload("hello")).toBe('"hello"');
  });

  it("serializes an object", () => {
    expect(truncatePayload({ a: 1 })).toBe('{"a":1}');
  });

  it("serializes an array", () => {
    expect(truncatePayload([1, 2, 3])).toBe("[1,2,3]");
  });

  it("passes through values at exactly maxBytes (no truncation)", () => {
    const SUFFIX = "…[truncated]";
    const maxBytes = 50;
    // Build a string whose JSON serialization is exactly maxBytes chars
    const target = "x".repeat(maxBytes - 2); // -2 for the surrounding quotes
    const result = truncatePayload(target, maxBytes);
    expect(result.length).toBe(maxBytes);
    expect(result.endsWith(SUFFIX)).toBe(false);
  });

  it("truncates values one byte over the limit", () => {
    const SUFFIX = "…[truncated]";
    const maxBytes = 50;
    const target = "x".repeat(maxBytes - 2 + 1); // one char over when serialized
    const result = truncatePayload(target, maxBytes);
    expect(result.length).toBe(maxBytes);
    expect(result.endsWith(SUFFIX)).toBe(true);
  });

  it("truncates large payloads and appends the truncation marker", () => {
    const big = { data: "x".repeat(MAX_SNAPSHOT_BYTES * 2) };
    const result = truncatePayload(big);
    expect(result.length).toBe(MAX_SNAPSHOT_BYTES);
    expect(result.endsWith("…[truncated]")).toBe(true);
  });

  it("uses MAX_SNAPSHOT_BYTES as the default limit", () => {
    const str = "a".repeat(MAX_SNAPSHOT_BYTES * 2);
    const result = truncatePayload(str);
    expect(result.length).toBe(MAX_SNAPSHOT_BYTES);
  });

  it("does not truncate values smaller than the limit", () => {
    const small = { x: 1 };
    const result = truncatePayload(small);
    expect(result).toBe('{"x":1}');
    expect(result.endsWith("…[truncated]")).toBe(false);
  });

  it("falls back to String() for non-JSON-serializable values (e.g. BigInt)", () => {
    // BigInt throws during JSON.stringify
    const result = truncatePayload(BigInt(123));
    expect(result).toBe("123");
  });

  it("returns 'null' for functions (JSON.stringify returns undefined)", () => {
    const result = truncatePayload(() => {});
    expect(result).toBe("null");
  });

  it("handles empty string input", () => {
    expect(truncatePayload("")).toBe('""');
  });

  it("handles empty object", () => {
    expect(truncatePayload({})).toBe("{}");
  });

  it("handles empty array", () => {
    expect(truncatePayload([])).toBe("[]");
  });

  it("truncates when maxBytes equals the suffix length (result is just the suffix)", () => {
    const SUFFIX = "…[truncated]";
    // "hello world" serializes to '"hello world"' (13 chars) > SUFFIX.length (12)
    const result = truncatePayload("hello world", SUFFIX.length);
    expect(result).toBe(SUFFIX);
    expect(result.length).toBe(SUFFIX.length);
  });
});
