import { describe, it, expect } from "vitest";
import { execute } from "@/lib/nodes/workflow-input";
import { makeNode, makeCtx } from "./helpers";

const node = makeNode("workflowInput");

describe("workflow-input — body handle (default)", () => {
  it("returns the full request body when sourceHandle is null", async () => {
    const body = { message: "hello", user: "alice" };
    const r = await execute.execute(node, null, makeCtx({ body }));
    expect(r.value).toEqual(body);
  });

  it("returns empty object for an empty body", async () => {
    const r = await execute.execute(node, null, makeCtx({ body: {} }));
    expect(r.value).toEqual({});
  });

  it("returns inputTokens=0 and outputTokens=0", async () => {
    const r = await execute.execute(node, null, makeCtx({ body: { x: 1 } }));
    expect(r.inputTokens).toBe(0);
    expect(r.outputTokens).toBe(0);
  });
});

describe("workflow-input — method handle", () => {
  it("returns the HTTP method", async () => {
    const r = await execute.execute(node, "method", makeCtx({ reqCtx: { method: "GET", url: "http://localhost", rawBody: "", ip: "1.2.3.4" } }));
    expect(r.value).toBe("GET");
  });

  it("returns POST when method is POST", async () => {
    const r = await execute.execute(node, "method", makeCtx());
    expect(r.value).toBe("POST");
  });
});

describe("workflow-input — ip handle", () => {
  it("returns the request IP address", async () => {
    const r = await execute.execute(node, "ip", makeCtx({ reqCtx: { method: "POST", url: "http://localhost", rawBody: "", ip: "10.0.0.1" } }));
    expect(r.value).toBe("10.0.0.1");
  });

  it("returns the default IP from makeCtx", async () => {
    const r = await execute.execute(node, "ip", makeCtx());
    expect(r.value).toBe("127.0.0.1");
  });
});

describe("workflow-input — raw handle", () => {
  it("returns the raw body string", async () => {
    const r = await execute.execute(node, "raw", makeCtx({ reqCtx: { method: "POST", url: "http://localhost", rawBody: '{"hello":"world"}', ip: "127.0.0.1" } }));
    expect(r.value).toBe('{"hello":"world"}');
  });

  it("returns empty string when rawBody is empty", async () => {
    const r = await execute.execute(node, "raw", makeCtx());
    expect(r.value).toBe("");
  });
});

describe("workflow-input — headers handle", () => {
  it("returns headers as a plain object", async () => {
    const headers = new Headers({ "content-type": "application/json", "x-api-key": "abc123" });
    const r = await execute.execute(node, "headers", makeCtx({ reqHeaders: headers }));
    expect(r.value).toMatchObject({ "content-type": "application/json", "x-api-key": "abc123" });
  });

  it("returns empty object when no headers are set", async () => {
    const r = await execute.execute(node, "headers", makeCtx({ reqHeaders: new Headers() }));
    expect(r.value).toEqual({});
  });
});

describe("workflow-input — query handle", () => {
  it("returns query params as a plain object", async () => {
    const r = await execute.execute(node, "query", makeCtx({
      reqCtx: { method: "GET", url: "http://localhost/api?foo=bar&baz=1", rawBody: "", ip: "127.0.0.1" },
    }));
    expect(r.value).toEqual({ foo: "bar", baz: "1" });
  });

  it("returns empty object when no query params exist", async () => {
    const r = await execute.execute(node, "query", makeCtx({
      reqCtx: { method: "GET", url: "http://localhost/api", rawBody: "", ip: "127.0.0.1" },
    }));
    expect(r.value).toEqual({});
  });

  it("returns empty object for a malformed URL", async () => {
    const r = await execute.execute(node, "query", makeCtx({
      reqCtx: { method: "GET", url: "not-a-url", rawBody: "", ip: "127.0.0.1" },
    }));
    expect(r.value).toEqual({});
  });
});
