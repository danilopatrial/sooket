/**
 * Regression test for API-13: a ResponseBuilder result with a null-body status
 * (e.g. 204) and no body must produce that status with an empty body, not a
 * Next.js 500 from `new Response("", { status: 204 })` throwing
 * "Response with null body status cannot have body".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/execution-handler", () => ({
  handleExecutionRequest: vi.fn(),
  CORS_HEADERS: { "Access-Control-Allow-Origin": "*" },
}));

vi.mock("@/lib/request-limit", () => ({
  readLimitedText: vi.fn(async () => "{}"),
  RequestBodyTooLargeError: class RequestBodyTooLargeError extends Error {},
}));

import { POST } from "@/app/api/v1/chat/route";
import { handleExecutionRequest } from "@/lib/execution-handler";

function req(): Request {
  return new Request("http://localhost/api/v1/chat", {
    method: "POST",
    headers: { Authorization: "Bearer sk-wf-x", "Content-Type": "application/json" },
    body: "{}",
  });
}

describe("chat route — null-body statuses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 204 with an empty body and CORS headers (no 500)", async () => {
    vi.mocked(handleExecutionRequest).mockResolvedValue({
      status: 204,
      body: "",
      corsHeaders: { "Access-Control-Allow-Origin": "*" },
    });
    const res = await POST(req());
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(await res.text()).toBe("");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 304 without a body even if one is provided", async () => {
    vi.mocked(handleExecutionRequest).mockResolvedValue({
      status: 304,
      body: "ignored",
      corsHeaders: {},
    });
    const res = await POST(req());
    expect(res.status).toBe(304);
    expect(res.body).toBeNull();
  });

  it("still serializes a normal 200 reply object", async () => {
    vi.mocked(handleExecutionRequest).mockResolvedValue({
      status: 200,
      body: { reply: "hi" },
      corsHeaders: {},
    });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reply: "hi" });
  });

  it("still sends a ResponseBuilder string body for a 200 status", async () => {
    vi.mocked(handleExecutionRequest).mockResolvedValue({
      status: 200,
      body: '{"ok":true}',
      corsHeaders: {},
    });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"ok":true}');
  });
});
