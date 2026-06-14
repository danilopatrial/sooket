/**
 * CORS policy for the execution + webhook APIs. Default is DENY (no
 * Access-Control-Allow-Origin); the operator opts in via CORS_ORIGIN = `*`
 * (wildcard) or a comma-separated allowlist (reflected per request). The
 * Methods/Headers are always present; only ACAO is gated.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { corsHeaders } from "@/lib/execution-handler";

const ACAO = "Access-Control-Allow-Origin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("corsHeaders — default deny", () => {
  it("emits no Access-Control-Allow-Origin when CORS_ORIGIN is unset", () => {
    vi.stubEnv("CORS_ORIGIN", undefined as unknown as string);
    const h = corsHeaders("https://evil.example");
    expect(h[ACAO]).toBeUndefined();
    // Methods/Headers are still present (inert without ACAO).
    expect(h["Access-Control-Allow-Methods"]).toBe("POST, GET, OPTIONS");
    expect(h["Access-Control-Allow-Headers"]).toBe("Authorization, Content-Type");
  });

  it("denies for empty / whitespace-only CORS_ORIGIN", () => {
    for (const v of ["", "   "]) {
      vi.stubEnv("CORS_ORIGIN", v);
      expect(corsHeaders("https://a.com")[ACAO]).toBeUndefined();
    }
  });
});

describe("corsHeaders — wildcard", () => {
  it("allows any origin when CORS_ORIGIN is *", () => {
    vi.stubEnv("CORS_ORIGIN", "*");
    expect(corsHeaders("https://anything.example")[ACAO]).toBe("*");
    // Wildcard does not need to vary on Origin.
    expect(corsHeaders(null)[ACAO]).toBe("*");
  });
});

describe("corsHeaders — allowlist", () => {
  it("reflects a matching origin and sets Vary: Origin", () => {
    vi.stubEnv("CORS_ORIGIN", "https://app.example.com");
    const h = corsHeaders("https://app.example.com");
    expect(h[ACAO]).toBe("https://app.example.com");
    expect(h["Vary"]).toBe("Origin");
  });

  it("denies (no ACAO) an origin not on the list, but still sets Vary", () => {
    vi.stubEnv("CORS_ORIGIN", "https://app.example.com");
    const h = corsHeaders("https://evil.example");
    expect(h[ACAO]).toBeUndefined();
    expect(h["Vary"]).toBe("Origin");
  });

  it("denies when no Origin header is present", () => {
    vi.stubEnv("CORS_ORIGIN", "https://app.example.com");
    expect(corsHeaders(null)[ACAO]).toBeUndefined();
    expect(corsHeaders(undefined)[ACAO]).toBeUndefined();
  });

  it("supports a comma-separated list and trims whitespace", () => {
    vi.stubEnv("CORS_ORIGIN", " https://a.com , https://b.com ");
    expect(corsHeaders("https://a.com")[ACAO]).toBe("https://a.com");
    expect(corsHeaders("https://b.com")[ACAO]).toBe("https://b.com");
    expect(corsHeaders("https://c.com")[ACAO]).toBeUndefined();
  });

  it("does not match a wildcard against an allowlist origin (exact match only)", () => {
    vi.stubEnv("CORS_ORIGIN", "https://a.com");
    expect(corsHeaders("*")[ACAO]).toBeUndefined();
    expect(corsHeaders("https://a.com.evil.com")[ACAO]).toBeUndefined();
  });
});
