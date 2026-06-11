/**
 * Regression test for ENGINE-06: when a source workflow fails and triggers its
 * assigned error workflow, the source's own execution record must be finalized
 * (status "failed") — the error workflow run must not reuse the source's hooks
 * and clobber its shared executionId, which previously left the source's row
 * orphaned at status "running".
 */
import { describe, it, expect } from "vitest";
import { executeWorkflow } from "@/lib/workflow-engine";
import type {
  Workflow,
  WorkflowDbAdapter,
  WorkflowHooks,
  WorkflowExecutionResult,
} from "@/lib/workflow-types";

const reqCtx = { method: "POST", url: "http://localhost", rawBody: "", ip: "127.0.0.1" };

// math node configured to throw "division by zero"
const divNode = { id: "div", type: "math", data: { operator: "/", defaultA: 10, defaultB: 0 } };
// static text — never throws
const txtNode = { id: "txt", type: "text", data: { text: "handled" } };
const outNode = { id: "out", type: "workflowOutput", data: {} };

interface ExecRow { id: number; workflowId: number; status: string }

/**
 * Adapter + hooks that mirror the production `createSqliteHooks` shape: the
 * hooks close over a single shared `executionId` bound to the source workflow,
 * and createExecution/updateExecution are routed through the adapter.
 */
function makeTracking(sourceWorkflow: Workflow, errorWorkflow: Workflow | null) {
  const rows: ExecRow[] = [];
  let nextId = 1;

  const adapter: WorkflowDbAdapter = {
    getCustomerVars:               () => [],
    getEncryptedProviderKey:       () => null,
    getAccessList:                 () => [],
    addAccessListEntry:            () => {},
    removeAccessListEntry:         () => {},
    getCacheEntry:                 () => null,
    setCacheEntry:                 () => {},
    evictExpiredCacheEntries:      () => {},
    getRateLimitCount: () => 0,
    incrementRateLimitCounter:     () => 1,
    evictExpiredRateLimitCounters: () => {},
    getSemanticCacheEntries:       () => [],
    insertSemanticCacheEntry:      () => {},
    evictExpiredSemanticCacheEntries: () => {},
    createExecution: (workflowId: number) => {
      const id = nextId++;
      rows.push({ id, workflowId, status: "running" });
      return id;
    },
    updateExecution: (executionId: number, data) => {
      const row = rows.find((r) => r.id === executionId);
      if (row) row.status = data.status;
    },
    linkExecutionToRequestLog: () => {},
    getWorkflowById: (id: number) =>
      errorWorkflow && id === errorWorkflow.id ? errorWorkflow : null,
    getWorkflowBySlug: () => null,
    getStaticData:  () => ({}),
    saveStaticData: () => {},
    listCredentials:   () => [],
    upsertCredential:  () => 1,
    deleteCredential:  () => {},
    linkCredential:    () => {},
    unlinkCredential:  () => {},
    getLinkedCredential: () => null,
  };

  // Mirror createSqliteHooks: workflowId is bound to the source at creation.
  let executionId = 0;
  const hooks: WorkflowHooks = {
    onWorkflowStart() {
      executionId = adapter.createExecution(sourceWorkflow.id, new Date().toISOString());
    },
    onWorkflowEnd(result: WorkflowExecutionResult) {
      if (executionId) {
        adapter.updateExecution(executionId, {
          status: result.error ? "failed" : "completed",
        } as Parameters<WorkflowDbAdapter["updateExecution"]>[1]);
      }
    },
    getExecutionId: () => (executionId ? String(executionId) : undefined),
  };

  return { adapter, hooks, rows };
}

describe("ENGINE-06 — error workflow does not orphan the source execution row", () => {
  const errorWorkflow: Workflow = {
    id: 2, is_active: 1, errorWorkflowId: null,
    nodes: [txtNode, outNode],
    edges: [{ id: "e", source: "txt", target: "out", sourceHandle: null }],
  };

  const sourceWorkflow: Workflow = {
    id: 1, is_active: 1, errorWorkflowId: 2,
    nodes: [divNode, outNode],
    edges: [{ id: "e", source: "div", target: "out", sourceHandle: null }],
  };

  it("finalizes the source's own execution row as 'failed'", async () => {
    const { adapter, hooks, rows } = makeTracking(sourceWorkflow, errorWorkflow);
    await executeWorkflow(sourceWorkflow, {}, reqCtx, new Headers(), "secret", adapter, hooks);

    // Only the source created a tracked execution (the error workflow runs with
    // empty hooks), and it is finalized as failed.
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, workflowId: 1, status: "failed" });
  });

  it("leaves no execution row stuck at status 'running'", async () => {
    const { adapter, hooks, rows } = makeTracking(sourceWorkflow, errorWorkflow);
    await executeWorkflow(sourceWorkflow, {}, reqCtx, new Headers(), "secret", adapter, hooks);

    expect(rows.some((r) => r.status === "running")).toBe(false);
  });

  it("still surfaces the original source error to the caller", async () => {
    const { adapter, hooks } = makeTracking(sourceWorkflow, errorWorkflow);
    const { error } = await executeWorkflow(sourceWorkflow, {}, reqCtx, new Headers(), "secret", adapter, hooks);
    expect(error).toMatch(/division by zero/);
  });
});
