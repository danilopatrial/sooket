/**
 * Engine-level tests for the wall-clock execution deadline.
 *
 * The deadline is enforced at every node boundary in evaluateNode. These tests
 * drive it deterministically by setting `reqCtx.deadlineAt` directly (past or
 * future) rather than relying on real elapsed time, and verify the auto-arming
 * behaviour by inspecting the reqCtx that executeWorkflow mutates.
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  executeWorkflow,
  executionTimeoutMs,
  WORKFLOW_TIMEOUT_ERROR,
} from "@/lib/workflow-engine";
import type { Workflow, WorkflowDbAdapter, ReqContext } from "@/lib/workflow-types";

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

// ─── Shared nodes ─────────────────────────────────────────────────────────────

const txtNode = { id: "txt", type: "text", data: { text: "hello" } };
const ncNode  = { id: "nc",  type: "null-check", data: {} };
const outNode = { id: "out", type: "workflowOutput", data: {} };

/** txt ──► nc ──► out — a trivial always-succeeds pipeline. */
const simpleWorkflow: Workflow = {
  id: 1, is_active: 1,
  nodes: [txtNode, ncNode, outNode],
  edges: [
    { id: "e1", source: "txt", target: "nc",  targetHandle: "input", sourceHandle: null },
    { id: "e2", source: "nc",  target: "out", sourceHandle: null },
  ],
};

// ─── executionTimeoutMs() resolver ────────────────────────────────────────────

describe("executionTimeoutMs", () => {
  const original = process.env.EXECUTION_TIMEOUT_MS;
  afterEach(() => {
    if (original === undefined) delete process.env.EXECUTION_TIMEOUT_MS;
    else process.env.EXECUTION_TIMEOUT_MS = original;
  });

  it("defaults to 30000 when unset", () => {
    delete process.env.EXECUTION_TIMEOUT_MS;
    expect(executionTimeoutMs()).toBe(30_000);
  });

  it("defaults to 30000 when empty/whitespace", () => {
    process.env.EXECUTION_TIMEOUT_MS = "   ";
    expect(executionTimeoutMs()).toBe(30_000);
  });

  it("parses a positive numeric value", () => {
    process.env.EXECUTION_TIMEOUT_MS = "5000";
    expect(executionTimeoutMs()).toBe(5000);
  });

  it("floors fractional values", () => {
    process.env.EXECUTION_TIMEOUT_MS = "1500.9";
    expect(executionTimeoutMs()).toBe(1500);
  });

  it.each(["0", "-1", "abc", "NaN"])("disables (returns 0) for non-positive/invalid %s", (v) => {
    process.env.EXECUTION_TIMEOUT_MS = v;
    expect(executionTimeoutMs()).toBe(0);
  });
});

// ─── Deadline enforcement ─────────────────────────────────────────────────────

describe("execution deadline — enforcement", () => {
  it("aborts with a timeout error when the deadline is already in the past", async () => {
    const ctx = { ...baseCtx(), deadlineAt: Date.now() - 1 };
    const { result, error } = await executeWorkflow(simpleWorkflow, {}, ctx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
    expect(error).toBeDefined();
    expect(error).toContain(WORKFLOW_TIMEOUT_ERROR);
  });

  it("completes normally when the deadline is comfortably in the future", async () => {
    const ctx = { ...baseCtx(), deadlineAt: Date.now() + 60_000 };
    const { result, error } = await executeWorkflow(simpleWorkflow, {}, ctx, new Headers(), "secret", adapter);
    expect(error).toBeUndefined();
    expect(result).not.toBeNull();
    expect(result!.value).toBe("hello");
  });
});

// ─── Terminal: deadline is not absorbed by error edges ────────────────────────

describe("execution deadline — terminal, bypasses error routing", () => {
  // nc has an error edge (→ dummy), so absent a deadline its own throws could be
  // absorbed. A blown deadline must still surface as a top-level engine error.
  const workflow: Workflow = {
    id: 2, is_active: 1,
    nodes: [txtNode, ncNode, outNode],
    edges: [
      { id: "e0", source: "nc",  target: "dummy", connectionType: "error" },
      { id: "e1", source: "txt", target: "nc",  targetHandle: "input", sourceHandle: null },
      { id: "e2", source: "nc",  target: "out", sourceHandle: null },
    ],
  };

  it("surfaces the timeout error rather than routing it down an error edge", async () => {
    const ctx = { ...baseCtx(), deadlineAt: Date.now() - 1 };
    const { result, error } = await executeWorkflow(workflow, {}, ctx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
    expect(error).toContain(WORKFLOW_TIMEOUT_ERROR);
  });
});

// ─── Auto-arming from EXECUTION_TIMEOUT_MS ────────────────────────────────────

describe("execution deadline — auto-arming", () => {
  const original = process.env.EXECUTION_TIMEOUT_MS;
  afterEach(() => {
    if (original === undefined) delete process.env.EXECUTION_TIMEOUT_MS;
    else process.env.EXECUTION_TIMEOUT_MS = original;
  });

  it("arms reqCtx.deadlineAt for a top-level run from the env budget", async () => {
    process.env.EXECUTION_TIMEOUT_MS = "50000";
    const ctx = baseCtx();
    const before = Date.now();
    await executeWorkflow(simpleWorkflow, {}, ctx, new Headers(), "secret", adapter);
    expect(ctx.deadlineAt).toBeDefined();
    // deadline ≈ now + 50s; allow generous slack for slow CI.
    expect(ctx.deadlineAt!).toBeGreaterThanOrEqual(before + 50_000);
    expect(ctx.deadlineAt!).toBeLessThanOrEqual(Date.now() + 50_000);
  });

  it("leaves reqCtx.deadlineAt unset when the budget is disabled (0)", async () => {
    process.env.EXECUTION_TIMEOUT_MS = "0";
    const ctx = baseCtx();
    await executeWorkflow(simpleWorkflow, {}, ctx, new Headers(), "secret", adapter);
    expect(ctx.deadlineAt).toBeUndefined();
  });

  it("never overwrites a deadline an upstream caller already set", async () => {
    process.env.EXECUTION_TIMEOUT_MS = "50000";
    const preset = Date.now() + 123_456;
    const ctx = { ...baseCtx(), deadlineAt: preset };
    await executeWorkflow(simpleWorkflow, {}, ctx, new Headers(), "secret", adapter);
    expect(ctx.deadlineAt).toBe(preset);
  });
});
