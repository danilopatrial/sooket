import { describe, it, expect, afterEach } from "vitest";
import { POST } from "@/app/api/unlock/route";

const orig = { ...process.env };
afterEach(() => {
  process.env = { ...orig };
});

function req(body: unknown, raw = false): Request {
  return new Request("http://localhost/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

describe("POST /api/unlock", () => {
  it("400 when auth is not enabled", async () => {
    delete process.env.SOOKET_AUTH_TOKEN;
    const res = await POST(req({ token: "x" }));
    expect(res.status).toBe(400);
  });

  it("400 on malformed JSON body", async () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    const res = await POST(req("not json{", true));
    expect(res.status).toBe(400);
  });

  it("401 on wrong / missing / non-string token", async () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    expect((await POST(req({ token: "wrong" }))).status).toBe(401);
    expect((await POST(req({}))).status).toBe(401);
    expect((await POST(req({ token: 123 }))).status).toBe(401);
  });

  it("200 + httpOnly cookie on correct token", async () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    delete process.env.SOOKET_HOST; // loopback → not Secure so it works over http
    const res = await POST(req({ token: "secret" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("sooket_auth=secret");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).not.toContain("secure");
  });

  it("marks the cookie Secure when bound to a non-loopback host", async () => {
    process.env.SOOKET_AUTH_TOKEN = "secret";
    process.env.SOOKET_HOST = "0.0.0.0";
    const res = await POST(req({ token: "secret" }));
    expect((res.headers.get("set-cookie") ?? "").toLowerCase()).toContain("secure");
  });
});
