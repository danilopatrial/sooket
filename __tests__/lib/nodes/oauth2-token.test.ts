import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// SSRF guard resolves DNS; map a normal host to a public IP and a designated
// host to an internal IP to exercise blocking.
vi.mock("node:dns/promises", () => {
  const lookup = vi.fn(async (host: string) =>
    host === "internal.ssrf.test"
      ? [{ address: "10.0.0.5", family: 4 }]
      : [{ address: "93.184.216.34", family: 4 }],
  );
  return { lookup, default: { lookup } };
});

import { execute } from "@/lib/nodes/oauth2-token";
import { makeNode, makeCtx } from "./helpers";
import type { NodeContext } from "@/lib/nodes/types";

function tokenFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

const TOKEN_URL = "https://issuer.example.com/oauth/token";

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("OAuth2 Token node", () => {
  it("fetches an access token via the client-credentials grant (body style)", async () => {
    const fetchMock = tokenFetch({ access_token: "tok-123", expires_in: 3600, token_type: "Bearer" });
    vi.stubGlobal("fetch", fetchMock);
    const node = makeNode("oauth2-token", { tokenUrl: TOKEN_URL, clientId: "cid", clientSecret: "secret", scope: "read write" });
    const res = await execute.execute(node, "token", makeCtx());

    expect(res.value).toBe("tok-123");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string; headers: Record<string, string> }];
    expect(url).toBe(TOKEN_URL);
    const form = new URLSearchParams(init.body);
    expect(form.get("grant_type")).toBe("client_credentials");
    expect(form.get("client_id")).toBe("cid");
    expect(form.get("client_secret")).toBe("secret");
    expect(form.get("scope")).toBe("read write");
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
  });

  it("uses HTTP Basic auth and omits the secret from the body when authStyle=basic", async () => {
    const fetchMock = tokenFetch({ access_token: "tok-b", expires_in: 100 });
    vi.stubGlobal("fetch", fetchMock);
    const node = makeNode("oauth2-token", { tokenUrl: TOKEN_URL, clientId: "cid", clientSecret: "sec", authStyle: "basic" });
    await execute.execute(node, "token", makeCtx());

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string; headers: Record<string, string> }];
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("cid:sec").toString("base64")}`);
    const form = new URLSearchParams(init.body);
    expect(form.get("client_secret")).toBeNull();
    expect(form.get("grant_type")).toBe("client_credentials");
  });

  it("returns a cached token without calling the token endpoint", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const node = makeNode("oauth2-token", { tokenUrl: TOKEN_URL, clientId: "cid", clientSecret: "s" });
    const ctx = makeCtx({ getCacheEntry: () => "cached-tok" });
    const res = await execute.execute(node, "token", ctx);
    expect(res.value).toBe("cached-tok");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches the token with TTL = expires_in minus the refresh skew", async () => {
    vi.stubGlobal("fetch", tokenFetch({ access_token: "tok", expires_in: 3600 }));
    const setCacheEntry = vi.fn();
    const node = makeNode("oauth2-token", { tokenUrl: TOKEN_URL, clientId: "cid", clientSecret: "s", refreshSkewSeconds: 60 });
    const ctx = makeCtx({ setCacheEntry } as Partial<NodeContext>);
    const before = Math.floor(Date.now() / 1000);
    await execute.execute(node, "token", ctx);
    expect(setCacheEntry).toHaveBeenCalledOnce();
    const [, value, expiresAt] = setCacheEntry.mock.calls[0] as [string, string, number];
    expect(value).toBe("tok");
    // expiresAt ≈ now + 3600 - 60
    expect(expiresAt).toBeGreaterThanOrEqual(before + 3540 - 1);
    expect(expiresAt).toBeLessThanOrEqual(before + 3540 + 2);
  });

  it("resolves $VAR references in the credentials from customer variables", async () => {
    const fetchMock = tokenFetch({ access_token: "tok", expires_in: 100 });
    vi.stubGlobal("fetch", fetchMock);
    const node = makeNode("oauth2-token", {
      tokenUrl: TOKEN_URL, clientId: "$CID", clientSecret: "$CSEC",
    });
    const ctx = makeCtx({ vars: new Map([["CID", "real-id"], ["CSEC", "real-secret"]]) });
    await execute.execute(node, "token", ctx);
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const form = new URLSearchParams(init.body);
    expect(form.get("client_id")).toBe("real-id");
    expect(form.get("client_secret")).toBe("real-secret");
  });

  it("throws when token URL or client id is missing", async () => {
    await expect(execute.execute(makeNode("oauth2-token", { clientId: "c" }), "token", makeCtx())).rejects.toThrow(/no token URL/);
    await expect(execute.execute(makeNode("oauth2-token", { tokenUrl: TOKEN_URL }), "token", makeCtx())).rejects.toThrow(/no client ID/);
  });

  it("throws on a non-2xx token response", async () => {
    vi.stubGlobal("fetch", tokenFetch({ error: "invalid_client" }, 401));
    const node = makeNode("oauth2-token", { tokenUrl: TOKEN_URL, clientId: "c", clientSecret: "s" });
    await expect(execute.execute(node, "token", makeCtx())).rejects.toThrow(/HTTP 401/);
  });

  it("throws when the response has no access_token", async () => {
    vi.stubGlobal("fetch", tokenFetch({ token_type: "Bearer" }));
    const node = makeNode("oauth2-token", { tokenUrl: TOKEN_URL, clientId: "c", clientSecret: "s" });
    await expect(execute.execute(node, "token", makeCtx())).rejects.toThrow(/missing access_token/);
  });

  it("blocks an SSRF token URL (internal host) and never calls fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const node = makeNode("oauth2-token", { tokenUrl: "https://internal.ssrf.test/token", clientId: "c", clientSecret: "s" });
    await expect(execute.execute(node, "token", makeCtx())).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
