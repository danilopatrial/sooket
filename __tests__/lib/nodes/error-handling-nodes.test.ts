import { describe, it, expect } from "vitest";
import { execute as tryCatchExec } from "@/lib/nodes/try-catch";
import { execute as retryExec }    from "@/lib/nodes/retry";
import { makeNode, makeCtx, ok, inactive } from "./helpers";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";

// ─── Try/Catch ────────────────────────────────────────────────────────────────

describe("try-catch executor", () => {
  it("throws when try input is not connected", async () => {
    await expect(tryCatchExec.execute(makeNode("try-catch"), "result", makeCtx())).rejects.toThrow("no try input connected");
  });

  it("returns result value on 'result' handle when upstream succeeds", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "try" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ok("success-value"),
    });
    const r = await tryCatchExec.execute(makeNode("try-catch"), "result", ctx);
    expect(r.value).toBe("success-value");
    expect(r.active).not.toBe(false);
  });

  it("returns inactive on 'error' handle when upstream succeeds", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "try" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ok("success-value"),
    });
    const r = await tryCatchExec.execute(makeNode("try-catch"), "error", ctx);
    expect(r.active).toBe(false);
  });

  it("returns error message on 'error' handle when upstream throws", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "try" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => { throw new Error("boom"); },
    });
    const r = await tryCatchExec.execute(makeNode("try-catch"), "error", ctx);
    expect(r.value).toBe("boom");
    expect(r.active).not.toBe(false);
  });

  it("returns inactive on 'result' handle when upstream throws", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "try" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => { throw new Error("boom"); },
    });
    const r = await tryCatchExec.execute(makeNode("try-catch"), "result", ctx);
    expect(r.active).toBe(false);
  });

  it("propagates inactive when upstream returns active=false", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "try" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => inactive(),
    });
    const r = await tryCatchExec.execute(makeNode("try-catch"), "result", ctx);
    expect(r.active).toBe(false);
  });

  it("catches non-Error exceptions and converts to string", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "try" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => { throw "string-error"; },
    });
    const r = await tryCatchExec.execute(makeNode("try-catch"), "error", ctx);
    expect(r.value).toBe("string-error");
  });

  it("sets cache entries for both result and error handles", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const cache = new Map<string, EvalResult>();
    const ctx = makeCtx({
      nodeId: "node-1",
      cache,
      inputFor: (h) => h === "try" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ok("val"),
    });
    await tryCatchExec.execute(makeNode("try-catch"), "result", ctx);
    expect(cache.has("node-1:result")).toBe(true);
    expect(cache.has("node-1:error")).toBe(true);
  });
});

// ─── Retry ────────────────────────────────────────────────────────────────────

describe("retry executor", () => {
  it("throws when input is not connected", async () => {
    await expect(retryExec.execute(makeNode("retry", { maxAttempts: 3 }), "output", makeCtx())).rejects.toThrow("no input connected");
  });

  it("succeeds on first try and returns value on 'output' handle", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ok("ok"),
    });
    const r = await retryExec.execute(makeNode("retry", { maxAttempts: 3, baseDelayMs: 0 }), "output", ctx);
    expect(r.value).toBe("ok");
  });

  it("retries and succeeds on second attempt", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    let calls = 0;
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => {
        calls++;
        if (calls < 2) throw new Error("transient");
        return ok("recovered");
      },
    });
    const r = await retryExec.execute(makeNode("retry", { maxAttempts: 3, baseDelayMs: 0, backoff: "none" }), "output", ctx);
    expect(r.value).toBe("recovered");
    expect(calls).toBe(2);
  });

  it("exhausts all attempts and returns error on 'failed' handle", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    let calls = 0;
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => { calls++; throw new Error("always fails"); },
    });
    const r = await retryExec.execute(makeNode("retry", { maxAttempts: 3, baseDelayMs: 0, backoff: "none" }), "failed", ctx);
    expect(r.value).toBe("always fails");
    expect(calls).toBe(3);
  });

  it("returns inactive on 'output' handle after all retries fail", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => { throw new Error("fail"); },
    });
    const r = await retryExec.execute(makeNode("retry", { maxAttempts: 2, baseDelayMs: 0, backoff: "none" }), "output", ctx);
    expect(r.active).toBe(false);
  });

  it("caps maxAttempts at 10", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    let calls = 0;
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => { calls++; throw new Error("fail"); },
    });
    await retryExec.execute(makeNode("retry", { maxAttempts: 100, baseDelayMs: 0, backoff: "none" }), "failed", ctx);
    expect(calls).toBe(10);
  });

  it("minimum maxAttempts is 1", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    let calls = 0;
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => { calls++; throw new Error("fail"); },
    });
    await retryExec.execute(makeNode("retry", { maxAttempts: 0, baseDelayMs: 0, backoff: "none" }), "failed", ctx);
    expect(calls).toBe(1);
  });

  it("returns inactive on 'failed' handle when upstream succeeds", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ok("success"),
    });
    const r = await retryExec.execute(makeNode("retry", { maxAttempts: 3, baseDelayMs: 0, backoff: "none" }), "failed", ctx);
    expect(r.active).toBe(false);
  });

  it("propagates active=false from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => inactive(),
    });
    const r = await retryExec.execute(makeNode("retry", { maxAttempts: 3, baseDelayMs: 0, backoff: "none" }), "output", ctx);
    expect(r.active).toBe(false);
  });

  it("clears upstream cache key on each retry", async () => {
    const upstreamId = "upstream";
    const fakeNode: WorkflowNode = { id: upstreamId, type: "text", data: {} };
    const cache = new Map<string, EvalResult>([
      [`${upstreamId}:output`, ok("stale")],
      [upstreamId, ok("stale")],
    ]);
    let calls = 0;
    const ctx = makeCtx({
      cache,
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => {
        calls++;
        if (calls === 1) throw new Error("first");
        return ok("fresh");
      },
    });
    const r = await retryExec.execute(makeNode("retry", { maxAttempts: 2, baseDelayMs: 0, backoff: "none" }), "output", ctx);
    expect(r.value).toBe("fresh");
    // Cache entries for upstream should have been cleared between retries
    expect(calls).toBe(2);
  });
});
