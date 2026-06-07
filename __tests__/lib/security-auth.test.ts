import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isLoopbackHost,
  resolveHost,
  resolveAuthToken,
  safeEqual,
  warnIfExposedWithoutAuth,
  isPublicPath,
  isAuthorized,
  AUTH_COOKIE,
} from "@/lib/security/auth";

// ─── isLoopbackHost ─────────────────────────────────────────────────────────

describe("isLoopbackHost", () => {
  it("treats loopback addresses and localhost as loopback", () => {
    for (const h of ["127.0.0.1", "::1", "[::1]", "localhost", "LOCALHOST", "127.5.6.7", " 127.0.0.1 "]) {
      expect(isLoopbackHost(h)).toBe(true);
    }
  });

  it("treats all-interfaces binds and routable hosts as exposed", () => {
    for (const h of ["0.0.0.0", "::", "192.168.1.10", "10.0.0.5", "example.com", ""]) {
      expect(isLoopbackHost(h)).toBe(false);
    }
  });
});

// ─── resolveHost / resolveAuthToken (env handling) ──────────────────────────

describe("env resolvers", () => {
  const orig = { ...process.env };
  afterEach(() => {
    process.env = { ...orig };
  });

  it("resolveHost defaults to loopback when unset or empty", () => {
    delete process.env.SOOKET_HOST;
    expect(resolveHost()).toBe("127.0.0.1");
    process.env.SOOKET_HOST = "   ";
    expect(resolveHost()).toBe("127.0.0.1");
    process.env.SOOKET_HOST = "0.0.0.0";
    expect(resolveHost()).toBe("0.0.0.0");
  });

  it("resolveAuthToken returns null when unset/empty, trimmed value otherwise", () => {
    delete process.env.SOOKET_AUTH_TOKEN;
    expect(resolveAuthToken()).toBeNull();
    process.env.SOOKET_AUTH_TOKEN = "   ";
    expect(resolveAuthToken()).toBeNull();
    process.env.SOOKET_AUTH_TOKEN = "  s3cret  ";
    expect(resolveAuthToken()).toBe("s3cret");
  });
});

// ─── safeEqual ──────────────────────────────────────────────────────────────

describe("safeEqual", () => {
  it("returns true only for identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("", "")).toBe(true);
    expect(safeEqual("a-very-long-token-value", "a-very-long-token-value")).toBe(true);
  });

  it("returns false for differing or different-length strings without throwing", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
    expect(safeEqual("abc", "")).toBe(false);
    expect(safeEqual("", "abc")).toBe(false);
    // multibyte: same char count, different byte length must not throw
    expect(safeEqual("é", "e")).toBe(false);
  });
});

// ─── warnIfExposedWithoutAuth ───────────────────────────────────────────────

describe("warnIfExposedWithoutAuth", () => {
  const orig = { ...process.env };
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
    process.env = { ...orig };
  });

  it("warns when exposed and no token set", () => {
    process.env.SOOKET_HOST = "0.0.0.0";
    delete process.env.SOOKET_AUTH_TOKEN;
    warnIfExposedWithoutAuth();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0][0])).toContain("SECURITY WARNING");
  });

  it("stays silent on loopback even without a token", () => {
    delete process.env.SOOKET_HOST;
    delete process.env.SOOKET_AUTH_TOKEN;
    warnIfExposedWithoutAuth();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("stays silent when exposed but a token is set", () => {
    process.env.SOOKET_HOST = "0.0.0.0";
    process.env.SOOKET_AUTH_TOKEN = "secret";
    warnIfExposedWithoutAuth();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ─── isPublicPath ───────────────────────────────────────────────────────────

describe("isPublicPath", () => {
  it("keeps execution, webhook, health and unlock paths public", () => {
    for (const p of [
      "/api/health",
      "/api/v1/chat",
      "/api/v1/anything",
      "/api/webhooks/my-flow",
      "/unlock",
      "/api/unlock",
    ]) {
      expect(isPublicPath(p)).toBe(true);
    }
  });

  it("gates the management surface and dashboard", () => {
    for (const p of [
      "/api/workflows",
      "/api/workflows/abc/api-keys",
      "/api/account/api-key",
      "/api/admin/backup",
      "/api/credentials",
      "/workflow",
      "/",
    ]) {
      expect(isPublicPath(p)).toBe(false);
    }
  });
});

// ─── isAuthorized ───────────────────────────────────────────────────────────

describe("isAuthorized", () => {
  const TOKEN = "the-shared-secret";

  it("accepts a matching Bearer header", () => {
    expect(isAuthorized(TOKEN, `Bearer ${TOKEN}`, null)).toBe(true);
    expect(isAuthorized(TOKEN, `bearer ${TOKEN}`, null)).toBe(true);
  });

  it("accepts a raw (non-Bearer) Authorization value matching the token", () => {
    expect(isAuthorized(TOKEN, TOKEN, null)).toBe(true);
  });

  it("accepts a matching cookie value", () => {
    expect(isAuthorized(TOKEN, null, TOKEN)).toBe(true);
  });

  it("rejects when nothing matches", () => {
    expect(isAuthorized(TOKEN, null, null)).toBe(false);
    expect(isAuthorized(TOKEN, "Bearer wrong", null)).toBe(false);
    expect(isAuthorized(TOKEN, null, "wrong")).toBe(false);
    expect(isAuthorized(TOKEN, "Bearer ", null)).toBe(false);
    expect(isAuthorized(TOKEN, "", "")).toBe(false);
  });

  it("exposes the cookie name constant", () => {
    expect(AUTH_COOKIE).toBe("sooket_auth");
  });
});
