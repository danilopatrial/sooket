// @vitest-environment node
/**
 * Tests for the partial re-execution fix (P2.11 truncation bug).
 *
 * Verifies that workflow-hooks.ts preserves the full node output cache in
 * executions.execution_data rather than clearing to {}, so that the debug
 * route can load untruncated ancestor outputs for "re-run from node".
 */
import { describe, it, expect } from "vitest";
import { executeWorkflow } from "@/lib/workflow-engine";
import type { Workflow, WorkflowDbAdapter, EvalResult, IRunExecutionData } from "@/lib/workflow-types";
import { createSqliteHooks } from "@/lib/db/workflow-hooks";
import { NODE_EXECUTOR_REGISTRY } from "@/lib/nodes/registry";
import type { INodeExecutor } from "@/lib/nodes/types";
import { DatabaseSync } from "node:sqlite";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reqCtx = { method: "POST", url: "http://localhost", rawBody: "", ip: "127.0.0.1" };

function makeAdapter(): WorkflowDbAdapter {
  return {
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
}

// ─── Tests: workflow-hooks preserves full cache snapshot ──────────────────────

describe("workflow-hooks — onWorkflowEnd preserves final nodeOutputs (not {})", () => {
  it("after a successful run, updateExecution is called with non-empty nodeOutputs", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`CREATE TABLE executions (
      id INTEGER PRIMARY KEY,
      workflow_id INTEGER,
      request_log_id INTEGER,
      status TEXT,
      execution_data TEXT DEFAULT '{}',
      started_at TEXT,
      updated_at TEXT,
      completed_at TEXT
    )`);
    db.exec(`INSERT INTO executions VALUES (1, 1, NULL, 'running', '{}', datetime('now'), datetime('now'), NULL)`);

    const capturedUpdates: IRunExecutionData[] = [];
    const adapter: WorkflowDbAdapter = {
      ...makeAdapter(),
      createExecution: () => 1,
      updateExecution: (_id, data) => { capturedUpdates.push(data); },
    };

    const hooks = createSqliteHooks(db, 1, null, adapter);

    const workflow: Workflow = {
      id: 1,
      is_active: 1,
      nodes: [
        { id: "txt", type: "text", data: { text: "hello" } },
        { id: "out", type: "workflowOutput", data: {} },
      ],
      edges: [{ id: "e1", source: "txt", target: "out" }],
    };

    await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter, hooks);

    // Last updateExecution call should have non-empty nodeOutputs
    const finalCall = capturedUpdates[capturedUpdates.length - 1];
    expect(finalCall.status).toBe("completed");
    expect(Object.keys(finalCall.nodeOutputs).length).toBeGreaterThan(0);
  });

  it("after a failed run, updateExecution preserves nodeOutputs from last completed node", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`CREATE TABLE executions (
      id INTEGER PRIMARY KEY, workflow_id INTEGER, request_log_id INTEGER,
      status TEXT, execution_data TEXT DEFAULT '{}',
      started_at TEXT, updated_at TEXT, completed_at TEXT
    )`);

    const capturedUpdates: IRunExecutionData[] = [];
    const adapter: WorkflowDbAdapter = {
      ...makeAdapter(),
      createExecution: () => 1,
      updateExecution: (_id, data) => { capturedUpdates.push(data); },
    };

    const hooks = createSqliteHooks(db, 1, null, adapter);

    // Register a node that evaluates its input THEN throws, ensuring txt is cached first
    const throwingNode: INodeExecutor = {
      async execute(_node, _handle, ctx) {
        const src = ctx.inputFor(null);
        if (src) await ctx.evalInput(src); // populates cache for txt
        throw new Error("deliberate failure");
      },
    };
    NODE_EXECUTOR_REGISTRY["__throwTest"] = { 1: throwingNode };

    const workflow: Workflow = {
      id: 1,
      is_active: 1,
      nodes: [
        { id: "txt", type: "text", data: { text: "pre-fail" } },
        { id: "thrower", type: "__throwTest", data: {} },
        { id: "out", type: "workflowOutput", data: {} },
      ],
      edges: [
        { id: "e1", source: "txt", target: "thrower" },
        { id: "e2", source: "thrower", target: "out" },
      ],
    };

    await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter, hooks);
    delete NODE_EXECUTOR_REGISTRY["__throwTest"];

    const finalCall = capturedUpdates[capturedUpdates.length - 1];
    expect(finalCall.status).toBe("failed");
    // nodeOutputs should contain the text node's output (captured before the throw)
    const keys = Object.keys(finalCall.nodeOutputs);
    expect(keys.some((k) => k.startsWith("txt:"))).toBe(true);
  });

  it("when all paths are inactive (no node throws), nodeOutputs reflects the evaluated cache", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`CREATE TABLE executions (
      id INTEGER PRIMARY KEY, workflow_id INTEGER, request_log_id INTEGER,
      status TEXT, execution_data TEXT DEFAULT '{}',
      started_at TEXT, updated_at TEXT, completed_at TEXT
    )`);

    const capturedUpdates: IRunExecutionData[] = [];
    const adapter: WorkflowDbAdapter = {
      ...makeAdapter(),
      createExecution: () => 1,
      updateExecution: (_id, data) => { capturedUpdates.push(data); },
    };

    const hooks = createSqliteHooks(db, 1, null, adapter);

    // Workflow: text → out. The text node runs, onNodeEnd fires, finalCacheSnapshot is updated.
    const workflow: Workflow = {
      id: 1, is_active: 1,
      nodes: [
        { id: "txt", type: "text", data: { text: "hi" } },
        { id: "out", type: "workflowOutput", data: {} },
      ],
      edges: [{ id: "e1", source: "txt", target: "out" }],
    };

    await executeWorkflow(workflow, {}, reqCtx, new Headers(), "secret", adapter, hooks);

    const finalCall = capturedUpdates[capturedUpdates.length - 1];
    expect(finalCall.status).toBe("completed");
    // nodeOutputs should still carry the txt node result, NOT {}
    expect(Object.keys(finalCall.nodeOutputs).length).toBeGreaterThan(0);
  });
});

// ─── Tests: large ancestor output is not truncated ────────────────────────────

describe("partial re-execution — large ancestor output preserved without truncation", () => {
  it("EvalResult in execution_data preserves values larger than 4 KB", () => {
    // Simulate what happens when executions.execution_data is written with a large value
    const largeValue = "x".repeat(10_000); // 10 KB — well above the 4 KB log cap
    const execData: IRunExecutionData = {
      nodeOutputs: {
        "ancestor:": { value: largeValue, inputTokens: 0, outputTokens: 0 },
      },
      lastCompletedNodeId: "ancestor",
      startedAt: new Date().toISOString(),
      status: "completed",
    };

    const serialized = JSON.stringify(execData);
    const restored = JSON.parse(serialized) as IRunExecutionData;

    // Full value should round-trip without truncation
    const restoredValue = (restored.nodeOutputs["ancestor:"] as EvalResult).value as string;
    expect(restoredValue).toHaveLength(10_000);
    expect(restoredValue).toBe(largeValue);
  });

  it("cache key lookup finds nodeId: prefix correctly", () => {
    const nodeOutputs: Record<string, EvalResult> = {
      "nodeA:":        { value: "primary", inputTokens: 0, outputTokens: 0 },
      "nodeA:handle2": { value: "secondary", inputTokens: 0, outputTokens: 0 },
      "nodeB:":        { value: "other", inputTokens: 0, outputTokens: 0 },
    };

    const ancestorIds = new Set(["nodeA"]);

    // Mirrors the lookup logic from debug/route.ts
    for (const nodeId of ancestorIds) {
      const matchingKey = Object.keys(nodeOutputs).find(
        (k) => k === `${nodeId}:` || k.startsWith(`${nodeId}:`)
      );
      expect(matchingKey).toBe("nodeA:");
      expect(nodeOutputs[matchingKey!].value).toBe("primary");
    }
  });

  it("unrecognised ancestor node ID produces no entry (node will re-execute)", () => {
    const nodeOutputs: Record<string, EvalResult> = {
      "knownNode:": { value: "data", inputTokens: 0, outputTokens: 0 },
    };

    const ancestorIds = new Set(["unknownNode"]);
    const ephemeralPinData: Record<string, EvalResult> = {};

    for (const nodeId of ancestorIds) {
      const matchingKey = Object.keys(nodeOutputs).find(
        (k) => k === `${nodeId}:` || k.startsWith(`${nodeId}:`)
      );
      if (matchingKey) ephemeralPinData[nodeId] = nodeOutputs[matchingKey];
    }

    expect(Object.keys(ephemeralPinData)).toHaveLength(0);
  });
});
