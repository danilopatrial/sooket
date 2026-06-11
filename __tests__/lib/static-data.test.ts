/**
 * Tests for P2.9 static data — per-workflow persistent key-value store.
 *
 * Registers a temporary "__testStatic" node that reads/writes ctx static data,
 * then verifies the adapter's saveStaticData is called and values survive
 * across sequential executeWorkflow invocations via the shared adapter.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { executeWorkflow } from "@/lib/workflow-engine";
import type { Workflow, WorkflowDbAdapter } from "@/lib/workflow-types";
import { NODE_EXECUTOR_REGISTRY } from "@/lib/nodes/registry";
import type { INodeExecutor } from "@/lib/nodes/types";

// ─── Stateful in-memory adapter ───────────────────────────────────────────────

function makeAdapter(): WorkflowDbAdapter & { _store: Record<number, Record<string, unknown>> } {
  const _store: Record<number, Record<string, unknown>> = {};
  return {
    _store,
    getCustomerVars:               ()        => [],
    getEncryptedProviderKey:       ()        => null,
    getAccessList:                 ()        => [],
    addAccessListEntry:            ()        => {},
    removeAccessListEntry:         ()        => {},
    getCacheEntry:                 ()        => null,
    setCacheEntry:                 ()        => {},
    evictExpiredCacheEntries:      ()        => {},
    getRateLimitCount: () => 0,
    incrementRateLimitCounter:     ()        => 1,
    evictExpiredRateLimitCounters: ()        => {},
    getSemanticCacheEntries:       ()        => [],
    insertSemanticCacheEntry:      ()        => {},
    evictExpiredSemanticCacheEntries: ()     => {},
    createExecution:               ()        => 1,
    updateExecution:               ()        => {},
    linkExecutionToRequestLog:     ()        => {},
    getWorkflowById:               ()        => null,
    getWorkflowBySlug:             ()        => null,
    listCredentials:               ()        => [],
    upsertCredential:              ()        => 1,
    deleteCredential:              ()        => {},
    linkCredential:                ()        => {},
    unlinkCredential:              ()        => {},
    getLinkedCredential:           ()        => null,
    getStaticData: (workflowId) =>
      _store[workflowId] ? { ..._store[workflowId] } : {},
    saveStaticData: (workflowId, data) => {
      _store[workflowId] = { ...data };
    },
  };
}

// ─── Test node ────────────────────────────────────────────────────────────────

const testStaticNode: INodeExecutor = {
  async execute(node, _handle, ctx) {
    const { action, key = "testKey", value: writeValue } =
      node.data as { action: string; key?: string; value?: unknown };

    if (action === "set") {
      ctx.setStaticData(key, writeValue);
      return { value: "set", inputTokens: 0, outputTokens: 0 };
    }
    if (action === "get") {
      return { value: ctx.getStaticData(key), inputTokens: 0, outputTokens: 0 };
    }
    if (action === "get-missing") {
      return { value: ctx.getStaticData("__nonexistent__"), inputTokens: 0, outputTokens: 0 };
    }
    if (action === "overwrite") {
      ctx.setStaticData(key, writeValue);
      return { value: ctx.getStaticData(key), inputTokens: 0, outputTokens: 0 };
    }
    return { value: null, inputTokens: 0, outputTokens: 0 };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reqCtx = { method: "POST", url: "http://localhost", rawBody: "", ip: "127.0.0.1" };
const WORKFLOW_ID = 42;

function makeWorkflow(nodeData: Record<string, unknown>): Workflow {
  return {
    id: WORKFLOW_ID,
    is_active: 1,
    nodes: [
      { id: "n", type: "__testStatic", data: nodeData },
      { id: "out", type: "workflowOutput", data: {} },
    ],
    edges: [{ id: "e1", source: "n", target: "out" }],
  };
}

// ─── Registry lifecycle ───────────────────────────────────────────────────────

beforeEach(() => {
  NODE_EXECUTOR_REGISTRY["__testStatic"] = { 1: testStaticNode };
});
afterEach(() => {
  delete NODE_EXECUTOR_REGISTRY["__testStatic"];
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("static data — adapter write-through on setStaticData", () => {
  it("calling setStaticData persists the value to the adapter", async () => {
    const adapter = makeAdapter();
    await executeWorkflow(makeWorkflow({ action: "set", value: 42 }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(adapter._store[WORKFLOW_ID]).toEqual({ testKey: 42 });
  });

  it("stores string values", async () => {
    const adapter = makeAdapter();
    await executeWorkflow(makeWorkflow({ action: "set", value: "hello" }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(adapter._store[WORKFLOW_ID]?.testKey).toBe("hello");
  });

  it("stores null value", async () => {
    const adapter = makeAdapter();
    await executeWorkflow(makeWorkflow({ action: "set", value: null }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(adapter._store[WORKFLOW_ID]).toEqual({ testKey: null });
  });

  it("stores object values", async () => {
    const adapter = makeAdapter();
    const obj = { a: 1, b: [2, 3] };
    await executeWorkflow(makeWorkflow({ action: "set", value: obj }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(adapter._store[WORKFLOW_ID]?.testKey).toEqual(obj);
  });
});

describe("static data — getStaticData reads from adapter", () => {
  it("returns undefined for a key that was never set", async () => {
    const adapter = makeAdapter();
    const { result } = await executeWorkflow(makeWorkflow({ action: "get-missing" }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(result!.value).toBeUndefined();
  });

  it("reads a value pre-seeded in the adapter before execution", async () => {
    const adapter = makeAdapter();
    adapter._store[WORKFLOW_ID] = { testKey: "pre-seeded" };
    const { result } = await executeWorkflow(makeWorkflow({ action: "get" }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(result!.value).toBe("pre-seeded");
  });
});

describe("static data — persistence across sequential executions", () => {
  it("value written in execution 1 is readable in execution 2", async () => {
    const adapter = makeAdapter();

    // Execution 1: write
    await executeWorkflow(
      makeWorkflow({ action: "set", value: 99 }),
      {}, reqCtx, new Headers(), "secret", adapter,
    );

    // Execution 2: read — should see 99
    const { result } = await executeWorkflow(
      makeWorkflow({ action: "get" }),
      {}, reqCtx, new Headers(), "secret", adapter,
    );
    expect(result!.value).toBe(99);
  });

  it("subsequent write overwrites and is visible in execution 3", async () => {
    const adapter = makeAdapter();

    await executeWorkflow(makeWorkflow({ action: "set", value: "first" }), {}, reqCtx, new Headers(), "secret", adapter);
    await executeWorkflow(makeWorkflow({ action: "set", value: "second" }), {}, reqCtx, new Headers(), "secret", adapter);

    const { result } = await executeWorkflow(makeWorkflow({ action: "get" }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(result!.value).toBe("second");
  });

  it("different workflow IDs have isolated stores", async () => {
    const adapter = makeAdapter();

    const wfA = makeWorkflow({ action: "set", value: "A-value" });
    const wfB = { ...makeWorkflow({ action: "set", value: "B-value" }), id: WORKFLOW_ID + 1 };

    await executeWorkflow(wfA, {}, reqCtx, new Headers(), "secret", adapter);
    await executeWorkflow(wfB, {}, reqCtx, new Headers(), "secret", adapter);

    expect(adapter._store[WORKFLOW_ID]?.testKey).toBe("A-value");
    expect(adapter._store[WORKFLOW_ID + 1]?.testKey).toBe("B-value");
  });
});

describe("static data — in-memory sync within a single execution", () => {
  it("overwrite in same execution is immediately visible to getStaticData in that same ctx call", async () => {
    // The "overwrite" action: sets then reads within same execute() call
    const adapter = makeAdapter();
    adapter._store[WORKFLOW_ID] = { testKey: "old" };

    const { result } = await executeWorkflow(
      makeWorkflow({ action: "overwrite", value: "new" }),
      {}, reqCtx, new Headers(), "secret", adapter,
    );
    expect(result!.value).toBe("new");
  });
});

describe("static data — edge cases", () => {
  it("zero numeric value is stored and retrieved correctly", async () => {
    const adapter = makeAdapter();
    await executeWorkflow(makeWorkflow({ action: "set", value: 0 }), {}, reqCtx, new Headers(), "secret", adapter);
    const { result } = await executeWorkflow(makeWorkflow({ action: "get" }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(result!.value).toBe(0);
  });

  it("empty string value is stored and retrieved correctly", async () => {
    const adapter = makeAdapter();
    await executeWorkflow(makeWorkflow({ action: "set", value: "" }), {}, reqCtx, new Headers(), "secret", adapter);
    const { result } = await executeWorkflow(makeWorkflow({ action: "get" }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(result!.value).toBe("");
  });

  it("false boolean value is stored and retrieved correctly", async () => {
    const adapter = makeAdapter();
    await executeWorkflow(makeWorkflow({ action: "set", value: false }), {}, reqCtx, new Headers(), "secret", adapter);
    const { result } = await executeWorkflow(makeWorkflow({ action: "get" }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(result!.value).toBe(false);
  });

  it("multiple distinct keys are stored independently", async () => {
    const adapter = makeAdapter();
    const multi: INodeExecutor = {
      async execute(_node, _h, ctx) {
        ctx.setStaticData("alpha", 1);
        ctx.setStaticData("beta", 2);
        return { value: null, inputTokens: 0, outputTokens: 0 };
      },
    };
    // Temporarily override the test node
    NODE_EXECUTOR_REGISTRY["__testStatic"] = { 1: multi };

    await executeWorkflow(makeWorkflow({ action: "ignored" }), {}, reqCtx, new Headers(), "secret", adapter);
    expect(adapter._store[WORKFLOW_ID]).toEqual({ alpha: 1, beta: 2 });
  });
});
