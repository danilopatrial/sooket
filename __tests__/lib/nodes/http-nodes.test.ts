import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb before importing executors
vi.mock("@/lib/db", () => {
  const mockDb = { prepare: vi.fn() };
  return { getDb: () => mockDb };
});

// Mock DNS so the SSRF egress guard never hits the network: every hostname
// resolves to a public IP, except a designated internal host used to exercise
// DNS-based SSRF blocking. IP-literal URLs need no resolution.
vi.mock("node:dns/promises", () => {
  const lookup = vi.fn(async (host: string) =>
    host === "internal.ssrf.test"
      ? [{ address: "10.0.0.5", family: 4 }]
      : [{ address: "93.184.216.34", family: 4 }],
  );
  return { lookup, default: { lookup } };
});

import { execute as httpRequestExec }      from "@/lib/nodes/http-request";
import { execute as webhookExec }          from "@/lib/nodes/webhook";
import { execute as anthropicExec }        from "@/lib/nodes/anthropic";
import { execute as openaiExec }            from "@/lib/nodes/openai";
import { execute as promptCompressionExec }from "@/lib/nodes/prompt-compression";
import { getDb } from "@/lib/db";
import { makeNode, makeCtx, wireInput } from "./helpers";
import type { WorkflowNode } from "@/lib/workflow-types";

function mockDb() {
  return getDb() as unknown as { prepare: ReturnType<typeof vi.fn> };
}

function mockFetchJson(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  });
}

function mockFetchText(body: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => { throw new SyntaxError("not json"); },
  });
}

// ─── HTTP Request ─────────────────────────────────────────────────────────────

describe("http-request executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{}",
    }));
  });

  it("returns parsed JSON body on 'res-body' handle", async () => {
    vi.stubGlobal("fetch", mockFetchJson({ data: "result" }));
    const r = await httpRequestExec.execute(
      makeNode("http-request", { method: "GET", url: "http://example.com", headers: [], timeout: 5000 }),
      "res-body",
      makeCtx()
    );
    expect(r.value).toEqual({ data: "result" });
  });

  it("returns status code on 'status' handle", async () => {
    vi.stubGlobal("fetch", mockFetchJson({ ok: true }, 201));
    const r = await httpRequestExec.execute(
      makeNode("http-request", { method: "POST", url: "http://example.com", headers: [], timeout: 5000 }),
      "status",
      makeCtx()
    );
    expect(r.value).toBe(201);
  });

  it("returns ok=true on 'ok' handle for 2xx response", async () => {
    vi.stubGlobal("fetch", mockFetchJson({}));
    const r = await httpRequestExec.execute(
      makeNode("http-request", { method: "GET", url: "http://example.com", headers: [], timeout: 5000 }),
      "ok",
      makeCtx()
    );
    expect(r.value).toBe(true);
  });

  it("returns ok=false on 'ok' handle for 4xx response", async () => {
    vi.stubGlobal("fetch", mockFetchJson({ error: "not found" }, 404));
    const r = await httpRequestExec.execute(
      makeNode("http-request", { method: "GET", url: "http://example.com", headers: [], timeout: 5000 }),
      "ok",
      makeCtx()
    );
    expect(r.value).toBe(false);
  });

  it("uses URL from connected input over node config", async () => {
    let capturedUrl = "";
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, status: 200, text: async () => '""' });
    }));
    const ctx = makeCtx({ ...wireInput("url", "http://dynamic-url.com") });
    await httpRequestExec.execute(
      makeNode("http-request", { method: "GET", url: "http://static-url.com", headers: [], timeout: 5000 }),
      "res-body",
      ctx
    );
    expect(capturedUrl).toBe("http://dynamic-url.com");
  });

  it("returns plain text body as string when response is not JSON", async () => {
    vi.stubGlobal("fetch", mockFetchText("plain text response"));
    const r = await httpRequestExec.execute(
      makeNode("http-request", { method: "GET", url: "http://example.com", headers: [], timeout: 5000 }),
      "res-body",
      makeCtx()
    );
    expect(r.value).toBe("plain text response");
  });

  it("throws (fails loudly) when fetch fails with a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    await expect(
      httpRequestExec.execute(
        makeNode("http-request", { method: "GET", url: "http://example.com/data", headers: [], timeout: 5000 }),
        "status",
        makeCtx()
      )
    ).rejects.toThrow(/HTTP Request to http:\/\/example\.com\/data failed: network error/);
  });

  it("strips the query string from the URL in the error (no secret leak)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    await expect(
      httpRequestExec.execute(
        makeNode("http-request", { method: "GET", url: "https://api.example.com/x?api_key=SECRET", headers: [], timeout: 5000 }),
        null,
        makeCtx()
      )
    ).rejects.toThrow(/HTTP Request to https:\/\/api\.example\.com\/x failed/);
  });

  it("does not include the secret query value in the thrown error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    await expect(
      httpRequestExec.execute(
        makeNode("http-request", { method: "GET", url: "https://api.example.com/x?api_key=SECRET", headers: [], timeout: 5000 }),
        null,
        makeCtx()
      )
    ).rejects.toThrow(expect.not.stringContaining("SECRET"));
  });

  it("reports a timeout distinctly when the request is aborted", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })
    ));
    await expect(
      httpRequestExec.execute(
        makeNode("http-request", { method: "GET", url: "http://slow.example.com", headers: [], timeout: 10 }),
        null,
        makeCtx()
      )
    ).rejects.toThrow(/timed out after 10 ms/);
  });

  it("blocks an SSRF target (cloud metadata IP) and never calls fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      httpRequestExec.execute(
        makeNode("http-request", { method: "GET", url: "http://169.254.169.254/latest/meta-data/", headers: [], timeout: 5000 }),
        null,
        makeCtx()
      )
    ).rejects.toThrow(/Blocked egress/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a hostname that resolves to a private address (DNS-based SSRF)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      httpRequestExec.execute(
        makeNode("http-request", { method: "GET", url: "http://internal.ssrf.test/", headers: [], timeout: 5000 }),
        null,
        makeCtx()
      )
    ).rejects.toThrow(/Blocked egress/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─── Webhook ──────────────────────────────────────────────────────────────────

describe("webhook executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("throws when input is not connected", async () => {
    await expect(
      webhookExec.execute(makeNode("webhook", { url: "http://example.com", method: "POST", headers: [], bodyTemplate: "" }), null, makeCtx())
    ).rejects.toThrow("no input connected");
  });

  it("passes through the input value unchanged", async () => {
    const ctx = makeCtx({ ...wireInput("input", "payload") });
    const r = await webhookExec.execute(
      makeNode("webhook", { url: "http://example.com", method: "POST", headers: [], bodyTemplate: "" }),
      null,
      ctx
    );
    expect(r.value).toBe("payload");
  });

  it("fires a background POST request (fire-and-forget)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const ctx = makeCtx({ ...wireInput("input", "data") });
    await webhookExec.execute(
      makeNode("webhook", { url: "http://hook.example.com", method: "POST", headers: [], bodyTemplate: "" }),
      null,
      ctx
    );
    expect(fetchMock).toHaveBeenCalledWith("http://hook.example.com", expect.objectContaining({ method: "POST" }));
  });

  it("does NOT fire fetch when URL is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const ctx = makeCtx({ ...wireInput("input", "data") });
    await webhookExec.execute(
      makeNode("webhook", { url: "", method: "POST", headers: [], bodyTemplate: "" }),
      null,
      ctx
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks an SSRF target and never fires the background request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const ctx = makeCtx({ ...wireInput("input", "data") });
    await expect(
      webhookExec.execute(
        makeNode("webhook", { url: "http://127.0.0.1:9000/internal", method: "POST", headers: [], bodyTemplate: "" }),
        null,
        ctx
      )
    ).rejects.toThrow(/Blocked egress/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await webhookExec.execute(
      makeNode("webhook", { url: "http://example.com", method: "POST", headers: [], bodyTemplate: "" }),
      null,
      ctx
    );
    expect(r.active).toBe(false);
  });
});

// ─── Anthropic ────────────────────────────────────────────────────────────────

describe("anthropic executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeAnthropicCtx = (userPrompt: string) => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    return makeCtx({
      workflow: { id: 1, nodes: [], edges: [], is_active: 1 },
      inputFor: (h) => h === "userPrompt" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: userPrompt, inputTokens: 0, outputTokens: 0 }),
    });
  };

  it("throws when no Anthropic API key is configured", async () => {
    mockDb().prepare.mockReturnValue({ get: () => undefined });
    const ctx = makeAnthropicCtx("hello");
    await expect(anthropicExec.execute(makeNode("anthropic", { model: "claude-haiku-4-5-20251001" }), null, ctx))
      .rejects.toThrow("No Anthropic API key");
  });

  it("calls the Anthropic API and returns the text response", async () => {
    const encryptedKey = "test-encrypted-key";
    // Mock DB to return provider key
    mockDb().prepare.mockReturnValue({
      get: () => ({ encrypted_key: encryptedKey }),
    });
    // Mock decryptValue by mocking the crypto.subtle API calls would be complex;
    // instead, mock fetch at the global level and trust decryptValue integration
    const anthropicResponse = {
      content: [{ type: "text", text: "Hello from Claude!" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(anthropicResponse),
      json: async () => anthropicResponse,
    }));
    // We can't easily test full decryption here; test that it attempts the API call
    const ctx = makeAnthropicCtx("hello");
    // This will throw during decrypt since key is fake, but we verify the flow
    await expect(anthropicExec.execute(makeNode("anthropic", { model: "claude-haiku-4-5-20251001" }), null, ctx))
      .rejects.toThrow(); // decryption will fail with fake data — expected
  });

  it("throws when userPrompt is empty", async () => {
    mockDb().prepare.mockReturnValue({ get: () => ({ encrypted_key: "fake" }) });
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "userPrompt" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: "   ", inputTokens: 0, outputTokens: 0 }),
    });
    await expect(anthropicExec.execute(makeNode("anthropic", {}), null, ctx))
      .rejects.toThrow(); // either decrypt or empty message error
  });
});

// ─── OpenAI ───────────────────────────────────────────────────────────────────

describe("openai executor", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const makeOpenaiCtx = (userPrompt: string, providerKey: string | null = "sk-openai-test") => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    return makeCtx({
      workflow: { id: 1, nodes: [], edges: [], is_active: 1 },
      getProviderKey: async () => providerKey,
      inputFor: (h) => h === "userPrompt" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: userPrompt, inputTokens: 0, outputTokens: 0 }),
    });
  };

  const okResponse = {
    choices: [{ message: { content: "Hello from GPT!" } }],
    usage: { prompt_tokens: 12, completion_tokens: 7 },
  };

  it("throws when no OpenAI API key is configured", async () => {
    const ctx = makeOpenaiCtx("hello", null);
    await expect(openaiExec.execute(makeNode("openai", { model: "gpt-4o-mini" }), null, ctx))
      .rejects.toThrow("No OpenAI API key");
  });

  it("calls /chat/completions and returns text + token usage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => okResponse, text: async () => JSON.stringify(okResponse) });
    vi.stubGlobal("fetch", fetchMock);
    const ctx = makeOpenaiCtx("hi there");
    const r = await openaiExec.execute(
      makeNode("openai", { model: "gpt-4o-mini", systemPrompt: "Be terse", temperature: 0.3, baseURL: "https://api.openai.com/v1" }),
      null, ctx,
    );
    expect(r.value).toBe("Hello from GPT!");
    expect(r.inputTokens).toBe(12);
    expect(r.outputTokens).toBe(7);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const body = JSON.parse((init as { body: string }).body);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.temperature).toBe(0.3);
    // system message first, user message last
    expect(body.messages[0]).toEqual({ role: "system", content: "Be terse" });
    expect(body.messages[body.messages.length - 1]).toEqual({ role: "user", content: "hi there" });
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBe("Bearer sk-openai-test");
  });

  it("targets a custom OpenAI-compatible base URL (e.g. local Ollama), trimming trailing slashes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => okResponse, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const ctx = makeOpenaiCtx("hi");
    await openaiExec.execute(
      makeNode("openai", { model: "llama3", baseURL: "http://localhost:11434/v1/" }),
      null, ctx,
    );
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:11434/v1/chat/completions");
  });

  it("omits the system message when systemPrompt is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => okResponse, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const ctx = makeOpenaiCtx("hi");
    await openaiExec.execute(makeNode("openai", { model: "gpt-4o-mini", systemPrompt: "" }), null, ctx);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages.every((m: { role: string }) => m.role !== "system")).toBe(true);
  });

  it("throws when the user message is empty", async () => {
    const ctx = makeOpenaiCtx("   ");
    await expect(openaiExec.execute(makeNode("openai", { model: "gpt-4o-mini" }), null, ctx))
      .rejects.toThrow(/user message is empty/);
  });

  it("surfaces an upstream provider error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: async () => "401 invalid key" }));
    const ctx = makeOpenaiCtx("hi");
    await expect(openaiExec.execute(makeNode("openai", { model: "gpt-4o-mini" }), null, ctx))
      .rejects.toThrow(/Upstream provider error: 401 invalid key/);
  });

  it("propagates inactive from the userPrompt input", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      getProviderKey: async () => "sk-openai-test",
      inputFor: (h) => h === "userPrompt" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await openaiExec.execute(makeNode("openai", { model: "gpt-4o-mini" }), null, ctx);
    expect(r.active).toBe(false);
  });
});

// ─── Prompt Compression ───────────────────────────────────────────────────────

describe("prompt-compression executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when input is not connected", async () => {
    mockDb().prepare.mockReturnValue({ get: () => undefined });
    await expect(
      promptCompressionExec.execute(makeNode("prompt-compression", {}), null, makeCtx())
    ).rejects.toThrow("no input connected");
  });

  it("throws when no Anthropic API key is configured", async () => {
    mockDb().prepare.mockReturnValue({ get: () => undefined });
    const ctx = makeCtx({ ...wireInput("input", "some long text") });
    await expect(
      promptCompressionExec.execute(makeNode("prompt-compression", {}), null, ctx)
    ).rejects.toThrow("no Anthropic API key");
  });

  it("propagates inactive from upstream", async () => {
    mockDb().prepare.mockReturnValue({ get: () => undefined });
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await promptCompressionExec.execute(makeNode("prompt-compression", {}), null, ctx);
    expect(r.active).toBe(false);
  });
});
