import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "@/proxy";

const orig = { ...process.env };
afterEach(() => {
  process.env = { ...orig };
});

function req(path: string, init?: { auth?: string; cookie?: string }) {
  const headers = new Headers();
  if (init?.auth) headers.set("authorization", init.auth);
  if (init?.cookie) headers.set("cookie", `sooket_auth=${init.cookie}`);
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe("proxy() shared-secret gate", () => {
  it("passes everything through when SOOKET_AUTH_TOKEN is unset", () => {
    delete process.env.SOOKET_AUTH_TOKEN;
    const res = proxy(req("/api/workflows"));
    // NextResponse.next() carries the internal rewrite header and no redirect/401
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("returns 401 JSON for unauthenticated management API calls when gated", async () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    const res = proxy(req("/api/workflows"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Authentication required" });
  });

  it("redirects unauthenticated browser navigations to /unlock", () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    const res = proxy(req("/workflow"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/unlock");
    expect(loc).toContain("next=%2Fworkflow");
  });

  it("allows a valid Bearer token through", () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    const res = proxy(req("/api/workflows", { auth: "Bearer secret" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows a valid cookie through", () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    const res = proxy(req("/workflow", { cookie: "secret" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("never gates the public execution/webhook/health/unlock paths", () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    for (const p of ["/api/v1/chat", "/api/webhooks/x", "/api/health", "/unlock", "/api/unlock"]) {
      const res = proxy(req(p));
      expect(res.status, p).toBe(200);
      expect(res.headers.get("location"), p).toBeNull();
    }
  });

  it("exports a matcher excluding Next internals", () => {
    expect(config.matcher).toEqual(["/((?!_next/static|_next/image|favicon.ico).*)"]);
  });
});
