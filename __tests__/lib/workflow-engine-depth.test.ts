/**
 * Engine-level tests for the recursion-depth guard.
 *
 * `evaluateNode` recurses on the JS call stack; cycle detection only catches
 * *circular* references, so a deep acyclic chain (e.g. a generated workflow)
 * would blow the stack with a RangeError. The guard converts that into a clean,
 * catchable `WorkflowDepthError`. These tests drive it deterministically by
 * setting `reqCtx.maxDepth` directly and by building linear chains of known
 * length, and verify auto-arming via the reqCtx that executeWorkflow mutates.
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  executeWorkflow,
  executionMaxDepth,
  DEFAULT_MAX_EXECUTION_DEPTH,
  WORKFLOW_DEPTH_ERROR,
} from "@/lib/workflow-engine";
import type { Workflow, WorkflowNode, WorkflowEdge, WorkflowDbAdapter, ReqContext } from "@/lib/workflow-types";

// ─── Minimal no-op adapter ────────────────────────────────────────────────────

const adapter: WorkflowDbAdapter = {
  getCustomerVars:               ()    => [],
  getEncryptedProviderKey:       ()    => null,
  getAccessList:                 ()    => [],
  addAccessListEntry:            ()    => {},
  removeAccessListEntry:         ()    => {},
  getCacheEntry:                 ()    => null,
  setCacheEntry:                 ()    => {},
  evictExpiredCacheEntries:      ()    => {},
  getRateLimitCount: () => 0,
  incrementRateLimitCounter:     ()    => 1,
  evictExpiredRateLimitCounters: ()    => {},
  getSemanticCacheEntries:       ()    => [],
  insertSemanticCacheEntry:      ()    => {},
  evictExpiredSemanticCacheEntries: () => {},
  createExecution:               ()    => 1,
  updateExecution:               ()    => {},
  linkExecutionToRequestLog:     ()    => {},
  getWorkflowById:               ()    => null,
  getWorkflowBySlug:             ()    => null,
  listCredentials:               ()    => [],
  upsertCredential:              ()    => 1,
  deleteCredential:              ()    => {},
  linkCredential:                ()    => {},
  unlinkCredential:              ()    => {},
  getLinkedCredential:           ()    => null,
  getStaticData:                 ()    => ({}),
  saveStaticData:                ()    => {},
};

const baseCtx = (): ReqContext => ({ method: "POST", url: "http://localhost", rawBody: "", ip: "127.0.0.1" });

/**
 * Build `txt ──► nc_0 ──► nc_1 ──► … ──► nc_{n-1} ──► out`, a linear acyclic
 * chain of `n` pass-through null-check nodes. Evaluating `out`'s source recurses
 * the full length of the chain, so depth ≈ n.
 */
function linearChain(n: number, id = 1): Workflow {
  const nodes: WorkflowNode[] = [{ id: "txt", type: "text", data: { text: "hello" } }];
  const edges: WorkflowEdge[] = [];
  let prev = "txt";
  for (let i = 0; i < n; i++) {
    const cur = `nc_${i}`;
    nodes.push({ id: cur, type: "null-check", data: {} });
    edges.push({ id: `e_${i}`, source: prev, target: cur, targetHandle: "input", sourceHandle: null });
    prev = cur;
  }
  nodes.push({ id: "out", type: "workflowOutput", data: {} });
  edges.push({ id: "e_out", source: prev, target: "out", sourceHandle: null });
  return { id, is_active: 1, nodes, edges };
}

// ─── executionMaxDepth() resolver ─────────────────────────────────────────────

describe("executionMaxDepth", () => {
  const original = process.env.EXECUTION_MAX_DEPTH;
  afterEach(() => {
    if (original === undefined) delete process.env.EXECUTION_MAX_DEPTH;
    else process.env.EXECUTION_MAX_DEPTH = original;
  });

  it("defaults to 1000 when unset", () => {
    delete process.env.EXECUTION_MAX_DEPTH;
    expect(executionMaxDepth()).toBe(DEFAULT_MAX_EXECUTION_DEPTH);
    expect(executionMaxDepth()).toBe(1000);
  });

  it("defaults when empty/whitespace", () => {
    process.env.EXECUTION_MAX_DEPTH = "   ";
    expect(executionMaxDepth()).toBe(1000);
  });

  it("parses a positive numeric value", () => {
    process.env.EXECUTION_MAX_DEPTH = "250";
    expect(executionMaxDepth()).toBe(250);
  });

  it("floors fractional values", () => {
    process.env.EXECUTION_MAX_DEPTH = "500.9";
    expect(executionMaxDepth()).toBe(500);
  });

  it.each(["abc", "NaN"])("falls back to the default for non-numeric %s", (v) => {
    process.env.EXECUTION_MAX_DEPTH = v;
    expect(executionMaxDepth()).toBe(1000);
  });

  it.each(["0", "-1"])("disables (returns 0) for non-positive %s", (v) => {
    process.env.EXECUTION_MAX_DEPTH = v;
    expect(executionMaxDepth()).toBe(0);
  });
});

// ─── Depth enforcement ────────────────────────────────────────────────────────

describe("execution depth — enforcement", () => {
  it("aborts with a depth error when the chain is deeper than the limit", async () => {
    const ctx = { ...baseCtx(), maxDepth: 5 };
    const { result, error } = await executeWorkflow(linearChain(20), {}, ctx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
    expect(error).toBeDefined();
    expect(error).toContain(WORKFLOW_DEPTH_ERROR);
    expect(error).toContain("max 5");
  });

  it("completes normally when the chain is within the limit", async () => {
    const ctx = { ...baseCtx(), maxDepth: 1000 };
    const { result, error } = await executeWorkflow(linearChain(10), {}, ctx, new Headers(), "secret", adapter);
    expect(error).toBeUndefined();
    expect(result).not.toBeNull();
    expect(result!.value).toBe("hello");
  });

  it("never enforces a limit when maxDepth is unset on the context", async () => {
    const ctx = baseCtx(); // no maxDepth, and no env arming here (passed directly)
    const { error } = await executeWorkflow(linearChain(50), {}, ctx, new Headers(), "secret", adapter);
    expect(error).toBeUndefined();
  });

  it("prevents a stack overflow on a very deep chain — clean error, no RangeError crash", async () => {
    // 3000 deep with the default 1000 guard: must throw WorkflowDepthError, not
    // a RangeError 'Maximum call stack size exceeded'.
    const ctx = { ...baseCtx(), maxDepth: DEFAULT_MAX_EXECUTION_DEPTH };
    const { result, error } = await executeWorkflow(linearChain(3000), {}, ctx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
    expect(error).toContain(WORKFLOW_DEPTH_ERROR);
    expect(error).not.toContain("call stack");
  });
});

// ─── Terminal: depth error is not absorbed by error edges ─────────────────────

describe("execution depth — terminal, bypasses error routing", () => {
  it("surfaces the depth error rather than routing it down an error edge", async () => {
    // Give the deepest node an error edge: a normal throw could be absorbed, but
    // a depth-limit abort must still surface as a top-level engine error.
    const wf = linearChain(20, 2);
    wf.edges.push({ id: "e_err", source: "nc_0", target: "dummy", connectionType: "error" });
    const ctx = { ...baseCtx(), maxDepth: 5 };
    const { result, error } = await executeWorkflow(wf, {}, ctx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
    expect(error).toContain(WORKFLOW_DEPTH_ERROR);
  });
});

// ─── Auto-arming from EXECUTION_MAX_DEPTH ─────────────────────────────────────

describe("execution depth — auto-arming", () => {
  const original = process.env.EXECUTION_MAX_DEPTH;
  afterEach(() => {
    if (original === undefined) delete process.env.EXECUTION_MAX_DEPTH;
    else process.env.EXECUTION_MAX_DEPTH = original;
  });

  it("arms reqCtx.maxDepth for a top-level run from the env limit", async () => {
    process.env.EXECUTION_MAX_DEPTH = "777";
    const ctx = baseCtx();
    await executeWorkflow(linearChain(3), {}, ctx, new Headers(), "secret", adapter);
    expect(ctx.maxDepth).toBe(777);
  });

  it("arms the default when EXECUTION_MAX_DEPTH is unset", async () => {
    delete process.env.EXECUTION_MAX_DEPTH;
    const ctx = baseCtx();
    await executeWorkflow(linearChain(3), {}, ctx, new Headers(), "secret", adapter);
    expect(ctx.maxDepth).toBe(DEFAULT_MAX_EXECUTION_DEPTH);
  });

  it("leaves reqCtx.maxDepth unset when the guard is disabled (0)", async () => {
    process.env.EXECUTION_MAX_DEPTH = "0";
    const ctx = baseCtx();
    await executeWorkflow(linearChain(3), {}, ctx, new Headers(), "secret", adapter);
    expect(ctx.maxDepth).toBeUndefined();
  });

  it("never overwrites a maxDepth an upstream caller already set", async () => {
    process.env.EXECUTION_MAX_DEPTH = "777";
    const ctx = { ...baseCtx(), maxDepth: 42 };
    await executeWorkflow(linearChain(3), {}, ctx, new Headers(), "secret", adapter);
    expect(ctx.maxDepth).toBe(42);
  });
});
