/**
 * Engine-level tests for typed-connection error routing.
 *
 * Uses real nodes (math for deterministic throws, null-check as a transparent
 * passthrough) and executeWorkflow so the full pull-graph machinery runs.
 */
import { describe, it, expect } from "vitest";
import { executeWorkflow } from "@/lib/workflow-engine";
import type { Workflow, WorkflowDbAdapter } from "@/lib/workflow-types";

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

const reqCtx = { method: "POST", url: "http://localhost", rawBody: "", ip: "127.0.0.1" };

// ─── Shared node helpers ──────────────────────────────────────────────────────

/** math node configured to throw "division by zero" */
const divNode = { id: "div", type: "math", data: { operator: "/", defaultA: 10, defaultB: 0 } };

/** null-check with no static fallback — passes through non-null input unchanged */
const ncNode  = { id: "nc",  type: "null-check", data: {} };

/** Static text — never throws */
const txtNode = { id: "txt", type: "text", data: { text: "hello" } };

/** workflowOutput — terminal, never in NODE_EXECUTOR_REGISTRY */
const outNode = { id: "out", type: "workflowOutput", data: {} };

// ─── Scenario A ───────────────────────────────────────────────────────────────
// Error-path consumer receives { error: msg } when source throws.
//
//   divNode ──(error)──► ncNode ──(main)──► outNode

describe("error routing — scenario A: error-path consumer gets the error value", () => {
  const workflow: Workflow = {
    id: 1, is_active: 1,
    nodes: [divNode, ncNode, outNode],
    edges: [
      { id: "e1", source: "div", target: "nc",  targetHandle: "input", sourceHandle: null, connectionType: "error" },
      { id: "e2", source: "nc",  target: "out", sourceHandle: null },
    ],
  };

  it("result value is { error: '...' } containing the throw message", async () => {
    const { result } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(result).not.toBeNull();
    expect(result!.value).toMatchObject({ error: expect.stringContaining("division by zero") });
  });

  it("result is active (not inactive)", async () => {
    const { result } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(result!.active).not.toBe(false);
  });

  it("no top-level engine error is surfaced", async () => {
    const { error } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(error).toBeUndefined();
  });
});

// ─── Scenario B ───────────────────────────────────────────────────────────────
// Main-path consumer gets inactive when source throws but has an error edge.
//
//   divNode ──(main)──► ncNode ──(main)──► outNode
//   divNode ──(error)──► [dummy target — just makes hasErrorEdge=true]

describe("error routing — scenario B: main-path consumer gets inactive when source fails", () => {
  const workflow: Workflow = {
    id: 2, is_active: 1,
    nodes: [divNode, ncNode, outNode],
    edges: [
      // Error edge exists so divNode doesn't re-throw (hasErrorEdge = true)
      { id: "e1", source: "div", target: "dummy", connectionType: "error" },
      // Main consumer
      { id: "e2", source: "div", target: "nc",  targetHandle: "input", sourceHandle: null },
      { id: "e3", source: "nc",  target: "out", sourceHandle: null },
    ],
  };

  it("result is null (nothing active reached the output)", async () => {
    const { result } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
  });

  it("no top-level engine error is surfaced (throw was absorbed by error edge)", async () => {
    const { error } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(error).toBeUndefined();
  });
});

// ─── Scenario C ───────────────────────────────────────────────────────────────
// No error edge → source throw propagates to the engine's top-level handler.
//
//   divNode ──(main)──► outNode

describe("error routing — scenario C: no error edge, throw propagates as engine error", () => {
  const workflow: Workflow = {
    id: 3, is_active: 1,
    nodes: [divNode, outNode],
    edges: [
      { id: "e1", source: "div", target: "out", sourceHandle: null },
    ],
  };

  it("result is null", async () => {
    const { result } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
  });

  it("error string contains the original throw message", async () => {
    const { error } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(error).toBeDefined();
    expect(error).toContain("division by zero");
  });
});

// ─── Scenario D ───────────────────────────────────────────────────────────────
// Source succeeds → error-path consumer receives inactive.
//
//   txtNode ──(error)──► ncNode ──(main)──► outNode

describe("error routing — scenario D: source succeeds, error-path consumer is inactive", () => {
  const workflow: Workflow = {
    id: 4, is_active: 1,
    nodes: [txtNode, ncNode, outNode],
    edges: [
      { id: "e1", source: "txt", target: "nc",  targetHandle: "input", sourceHandle: null, connectionType: "error" },
      { id: "e2", source: "nc",  target: "out", sourceHandle: null },
    ],
  };

  it("result is null because nothing reached the output via an active path", async () => {
    const { result } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
  });

  it("no engine error", async () => {
    const { error } = await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(error).toBeUndefined();
  });
});

// ─── Scenario E ───────────────────────────────────────────────────────────────
// Both paths from same failing source evaluated in same execution context.
// Error path gets the error value; main path is independently inactive.
// Verified by running both workflows against the same adapter/cache separately
// (the engine creates a fresh cache per executeWorkflow call, so they're isolated).

describe("error routing — scenario E: error and main paths are cache-isolated per call", () => {
  const errorPathWorkflow: Workflow = {
    id: 5, is_active: 1,
    nodes: [divNode, ncNode, outNode],
    edges: [
      { id: "e1", source: "div", target: "nc",  targetHandle: "input", connectionType: "error" },
      { id: "e2", source: "nc",  target: "out" },
    ],
  };

  const mainPathWorkflow: Workflow = {
    id: 5, is_active: 1,
    nodes: [divNode, ncNode, outNode],
    edges: [
      { id: "e1", source: "div", target: "dummy", connectionType: "error" },
      { id: "e2", source: "div", target: "nc",  targetHandle: "input" },
      { id: "e3", source: "nc",  target: "out" },
    ],
  };

  it("error path independently gets the error value", async () => {
    const { result } = await executeWorkflow(errorPathWorkflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(result!.value).toMatchObject({ error: expect.stringContaining("division by zero") });
  });

  it("main path independently gets inactive (null result)", async () => {
    const { result } = await executeWorkflow(mainPathWorkflow, {}, reqCtx, new Headers(), "secret", adapter);
    expect(result).toBeNull();
  });
});
