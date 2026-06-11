import { type NodeTrace, truncatePayload } from "@/lib/node-trace";
import { NODE_EXECUTOR_REGISTRY } from "@/lib/nodes/registry";
import { decryptValue } from "@/lib/nodes/utils";
import { binaryDataService } from "@/lib/binary-data";
import { extractNodeRefs, resolveNodeData } from "@/lib/expr";

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  EvalResult,
  ReqContext,
  WorkflowExecutionResult,
  WorkflowDbAdapter,
  WorkflowHooks,
} from "@/lib/workflow-types";

import type {
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  EvalResult,
  ReqContext,
  WorkflowExecutionResult,
  WorkflowDbAdapter,
  WorkflowHooks,
} from "@/lib/workflow-types";

// ─── Execution deadline ──────────────────────────────────────────────────────

/** Stable message prefix for an execution that exceeded its wall-clock budget. */
export const WORKFLOW_TIMEOUT_ERROR = "Workflow execution timed out";

/**
 * Thrown by the engine when an execution runs past its deadline. Carries the
 * configured limit so callers can report it. Distinct from node-level timeouts
 * (HTTP, Custom Code), which bound a single node — this bounds the whole graph.
 */
export class WorkflowTimeoutError extends Error {
  readonly limitMs: number;
  constructor(limitMs: number) {
    super(`${WORKFLOW_TIMEOUT_ERROR} after ${limitMs} ms`);
    this.name = "WorkflowTimeoutError";
    this.limitMs = limitMs;
  }
}

/**
 * Resolve the per-execution wall-clock budget from `EXECUTION_TIMEOUT_MS`,
 * defaulting to 30 s. A missing, empty, non-numeric, or non-positive value
 * disables the deadline (returns 0).
 */
export function executionTimeoutMs(): number {
  const raw = process.env.EXECUTION_TIMEOUT_MS?.trim();
  if (raw === undefined || raw === "") return 30_000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

// ─── Variable resolution ─────────────────────────────────────────────────────

async function loadCustomerVars(
  workflowId: number,
  encryptionSecret: string,
  adapter: WorkflowDbAdapter
): Promise<Map<string, string>> {
  const rows = adapter.getCustomerVars(workflowId);
  const map = new Map<string, string>();
  await Promise.all(
    rows.map(async (row) => {
      try {
        const value = await decryptValue(row.encryptedValue, encryptionSecret);
        map.set(row.name, value);
      } catch {
        // Skip rows that fail to decrypt
      }
    })
  );
  return map;
}

// ─── Graph evaluator ─────────────────────────────────────────────────────────

async function runNode(
  nodeId: string,
  sourceHandle: string | null | undefined,
  node: WorkflowNode,
  workflow: Workflow,
  body: Record<string, unknown>,
  cache: Map<string, EvalResult>,
  visiting: Set<string>,
  reqHeaders: Headers,
  vars: Map<string, string>,
  reqCtx: ReqContext,
  traces: NodeTrace[],
  encryptionSecret: string,
  adapter: WorkflowDbAdapter,
  hooks: WorkflowHooks,
  subDepth = 0
): Promise<EvalResult> {
  const inputFor = (handle: string | null) => {
    const matchTarget = (e: WorkflowEdge) =>
      e.target === nodeId && (handle === null ? !e.targetHandle : e.targetHandle === handle);

    // Prefer main-typed (or untyped) edges
    const mainEdge = workflow.edges.find((e) => matchTarget(e) && (e.connectionType === "main" || e.connectionType == null));
    if (mainEdge) {
      const src = workflow.nodes.find((n) => n.id === mainEdge.source);
      return src ? { node: src, sourceHandle: mainEdge.sourceHandle, connectionType: "main" as const } : null;
    }

    // Fall back to error-typed edges so receiving nodes need no special API
    const errorEdge = workflow.edges.find((e) => matchTarget(e) && e.connectionType === "error");
    if (errorEdge) {
      const src = workflow.nodes.find((n) => n.id === errorEdge.source);
      return src ? { node: src, sourceHandle: errorEdge.sourceHandle, connectionType: "error" as const } : null;
    }

    return null;
  };

  const inputForError = (handle: string | null) => {
    const edge = workflow.edges.find(
      (e) =>
        e.target === nodeId &&
        (handle === null ? !e.targetHandle : e.targetHandle === handle) &&
        e.connectionType === "error"
    );
    if (!edge) return null;
    const src = workflow.nodes.find((n) => n.id === edge.source);
    return src ? { node: src, sourceHandle: edge.sourceHandle } : null;
  };

  const evalInput = async (src: { node: WorkflowNode; sourceHandle: string | null | undefined; connectionType?: "main" | "error" }) => {
    const result = await evaluateNode(src.node.id, src.sourceHandle, workflow, body, cache, visiting, reqHeaders, vars, reqCtx, traces, encryptionSecret, adapter, hooks, subDepth);
    if (src.connectionType === "error") {
      const errorKey = `${src.node.id}:${src.sourceHandle ?? ""}:__error__`;
      if (cache.has(errorKey)) return cache.get(errorKey)!;
      // Source succeeded — error path is inactive
      return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 } as EvalResult;
    }
    return result;
  };

  // ── Expression language: resolve {{ $node.X }} / {{ $json }} / {{ $body }} ──
  // 1. Pre-evaluate any nodes referenced by $node.X expressions in data strings.
  const nodeRefs = extractNodeRefs(node.data);
  for (const refId of nodeRefs) {
    const refNodeDef = workflow.nodes.find((n) => n.id === refId);
    if (refNodeDef && !cache.has(`${refId}:`)) {
      await evaluateNode(refId, null, workflow, body, cache, visiting, reqHeaders, vars, reqCtx, traces, encryptionSecret, adapter, hooks, subDepth);
    }
  }
  // 2. Resolve primary input value for $json references.
  let primaryInputValue: unknown = undefined;
  const primarySrc = inputFor(null);
  if (primarySrc) {
    const pk = `${primarySrc.node.id}:${primarySrc.sourceHandle ?? ""}`;
    if (!cache.has(pk)) {
      await evalInput(primarySrc);
    }
    if (primarySrc.connectionType === "error") {
      // Error-path primary input: read from the error cache, not the inactive main entry
      const errKey = `${pk}:__error__`;
      primaryInputValue = cache.has(errKey) ? cache.get(errKey)!.value : undefined;
    } else {
      primaryInputValue = cache.get(pk)?.value;
    }
  }
  // 3. Substitute expressions in all string fields of node.data.
  const resolvedNode: typeof node = { ...node, data: resolveNodeData(node.data, cache, body, primaryInputValue) };

  const versionMap = NODE_EXECUTOR_REGISTRY[node.type];
  const registryExecutor = versionMap
    ? (versionMap[node.typeVersion ?? 1] ?? versionMap[1])
    : undefined;
  if (registryExecutor) {
    return registryExecutor.execute(resolvedNode, sourceHandle, {
      nodeId, workflow, body, cache, reqHeaders, vars, reqCtx, encryptionSecret, inputFor, inputForError, evalInput,
      executionId: hooks.getExecutionId?.() ?? "sandbox",
      binaryData: binaryDataService,

      getProviderKey: async (provider: string) => {
        const linked = adapter.getLinkedCredential(workflow.id, nodeId);
        if (linked !== null) return decryptValue(linked, encryptionSecret);
        const encrypted = adapter.getEncryptedProviderKey(workflow.id, provider);
        if (!encrypted) return null;
        return decryptValue(encrypted, encryptionSecret);
      },

      getAccessList: () => adapter.getAccessList(workflow.id),

      addAccessListEntry: (value: string, ruleType: string) =>
        adapter.addAccessListEntry(workflow.id, value, ruleType),

      removeAccessListEntry: (value: string) =>
        adapter.removeAccessListEntry(workflow.id, value),

      getCacheEntry: (key: string, now: number) =>
        adapter.getCacheEntry(key, now),

      setCacheEntry: (key: string, value: string, expiresAt: number) =>
        adapter.setCacheEntry(key, value, expiresAt),

      evictExpiredCacheEntries: (now: number) =>
        adapter.evictExpiredCacheEntries(now),

      incrementRateLimitCounter: (key: string, windowStart: number) =>
        adapter.incrementRateLimitCounter(key, windowStart),

      evictExpiredRateLimitCounters: (windowStart: number) =>
        adapter.evictExpiredRateLimitCounters(windowStart),

      getSemanticCacheEntries: (now: number) =>
        adapter.getSemanticCacheEntries(workflow.id, now),

      insertSemanticCacheEntry: (embedding: string, value: string, expiresAt: number) =>
        adapter.insertSemanticCacheEntry(workflow.id, embedding, value, expiresAt),

      evictExpiredSemanticCacheEntries: (now: number) =>
        adapter.evictExpiredSemanticCacheEntries(now),

      getStaticData: (key: string): unknown => {
        const stored = adapter.getStaticData(workflow.id);
        return stored[key];
      },

      setStaticData: (key: string, value: unknown): void => {
        const stored = adapter.getStaticData(workflow.id);
        const updated = { ...stored, [key]: value };
        adapter.saveStaticData(workflow.id, updated);
        // Keep the in-memory workflow object in sync for reads later in this execution
        workflow.staticData = updated;
      },

      executeSubWorkflow: async (slug: string, input: Record<string, unknown>): Promise<EvalResult> => {
        if (subDepth >= 5) {
          return { value: { error: "Sub-workflow recursion depth exceeded (max 5)" }, inputTokens: 0, outputTokens: 0 };
        }
        const subWf = adapter.getWorkflowBySlug(slug);
        if (!subWf) {
          return { value: { error: `Sub-workflow not found: "${slug}"` }, inputTokens: 0, outputTokens: 0 };
        }
        const res = await executeWorkflow(subWf, input, reqCtx, reqHeaders, encryptionSecret, adapter, {}, subDepth + 1);
        if (res.error) return { value: { error: res.error }, inputTokens: 0, outputTokens: 0 };
        return res.result ?? { value: undefined, inputTokens: 0, outputTokens: 0 };
      },
    });
  }

  return { value: undefined, inputTokens: 0, outputTokens: 0 };
}

async function evaluateNode(
  nodeId: string,
  sourceHandle: string | null | undefined,
  workflow: Workflow,
  body: Record<string, unknown>,
  cache: Map<string, EvalResult>,
  visiting: Set<string>,
  reqHeaders: Headers,
  vars: Map<string, string>,
  reqCtx: ReqContext,
  traces: NodeTrace[],
  encryptionSecret: string,
  adapter: WorkflowDbAdapter,
  hooks: WorkflowHooks,
  subDepth = 0
): Promise<EvalResult> {
  const cacheKey = `${nodeId}:${sourceHandle ?? ""}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // Wall-clock deadline: abort before scheduling any further work once the
  // execution budget is spent. Checked at every node boundary (cooperative
  // cancellation) so the engine stops launching new nodes and frees its
  // semaphore slot as soon as the in-flight node settles. Already-cached and
  // pinned reads above are instant and exempt.
  if (reqCtx.deadlineAt !== undefined && Date.now() > reqCtx.deadlineAt) {
    throw new WorkflowTimeoutError(executionTimeoutMs());
  }

  // Pinned-data short-circuit: return the frozen result without executing the node.
  if (workflow.pinData?.[nodeId]) {
    const pinned = workflow.pinData[nodeId];
    cache.set(cacheKey, pinned);
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (node && !traces.some((t) => t.nodeId === nodeId)) {
      traces.push({
        nodeId,
        nodeType: node.type,
        inputSnapshot: "null",
        outputSnapshot: truncatePayload(pinned.value),
        rawValue: pinned.value,
        durationMs: 0,
        pinned: true,
      });
    }
    return pinned;
  }

  if (visiting.has(nodeId)) {
    throw new Error(`Cycle detected: node "${nodeId}" is part of a circular reference`);
  }

  const node = workflow.nodes.find((n) => n.id === nodeId);
  if (!node) return { value: undefined, inputTokens: 0, outputTokens: 0 };

  // Disabled node: pass through the first upstream input unchanged.
  // Add nodeId to visiting before upstream evaluation to catch cycles through disabled chains.
  if (node.disabled) {
    visiting.add(nodeId);
    const upstreamEdge = workflow.edges.find(
      (e) => e.target === nodeId && (e.connectionType === "main" || e.connectionType == null)
    );
    let passthrough: EvalResult;
    try {
      passthrough = upstreamEdge
        ? await evaluateNode(upstreamEdge.source, upstreamEdge.sourceHandle, workflow, body, cache, visiting, reqHeaders, vars, reqCtx, traces, encryptionSecret, adapter, hooks, subDepth)
        : { value: undefined, inputTokens: 0, outputTokens: 0 };
    } finally {
      visiting.delete(nodeId);
    }
    cache.set(cacheKey, passthrough);
    if (!traces.some((t) => t.nodeId === nodeId)) {
      traces.push({ nodeId, nodeType: node.type, inputSnapshot: "null", outputSnapshot: "null", rawValue: undefined, durationMs: 0, disabled: true });
    }
    return passthrough;
  }

  await hooks.onNodeStart?.(nodeId, node.type);

  visiting.add(nodeId);
  const traceStart = Date.now();
  let traceOutput: unknown = undefined;
  let traceError: string | undefined;

  try {
    const result = await runNode(nodeId, sourceHandle, node, workflow, body, cache, visiting, reqHeaders, vars, reqCtx, traces, encryptionSecret, adapter, hooks, subDepth);
    cache.set(cacheKey, result);
    traceOutput = result.value;
    return result;
  } catch (err) {
    // A blown deadline is terminal: never let an error edge catch it and resume
    // the graph, or the execution budget would be unbounded in practice.
    if (err instanceof WorkflowTimeoutError) throw err;
    const errMsg = err instanceof Error ? err.message : String(err);
    const hasErrorEdge = workflow.edges.some(
      (e) => e.source === nodeId && e.connectionType === "error"
    );
    if (hasErrorEdge) {
      const errResult:      EvalResult = { value: { error: errMsg }, inputTokens: 0, outputTokens: 0 };
      const inactiveResult: EvalResult = { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      // Main-path consumers see inactive; error-path consumers read from the __error__ key.
      cache.set(cacheKey, inactiveResult);
      cache.set(`${cacheKey}:__error__`, errResult);
      traceOutput = errResult.value;
      traceError  = errMsg;
      return inactiveResult;
    }
    traceError = errMsg;
    throw err;
  } finally {
    visiting.delete(nodeId);
    const inEdges = workflow.edges.filter((e) => e.target === nodeId);
    const inputMap: Record<string, unknown> = {};
    for (const edge of inEdges) {
      const ck = `${edge.source}:${edge.sourceHandle ?? ""}`;
      const cached = cache.get(ck);
      if (cached !== undefined) inputMap[edge.targetHandle ?? "input"] = cached.value;
    }

    const existingIdx = traces.findIndex((t) => t.nodeId === nodeId);
    if (existingIdx >= 0) {
      // Node was already traced (multiple connected outputs) — merge this handle's output in
      const existing = traces[existingIdx];
      let outputObj: Record<string, unknown>;
      try {
        const parsed = JSON.parse(existing.outputSnapshot);
        outputObj = (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed))
          ? (parsed as Record<string, unknown>)
          : { output: parsed };
      } catch {
        outputObj = {};
      }
      outputObj[sourceHandle ?? "output"] = traceOutput;
      traces[existingIdx] = { ...existing, outputSnapshot: truncatePayload(outputObj), rawValue: traceOutput };
    } else {
      // First time this node is traced — key output by handle name so merges stay consistent
      const outputForTrace = sourceHandle != null ? { [sourceHandle]: traceOutput } : traceOutput;
      traces.push({
        nodeId,
        nodeType: node.type,
        inputSnapshot: truncatePayload(Object.keys(inputMap).length > 0 ? inputMap : undefined),
        outputSnapshot: truncatePayload(outputForTrace),
        rawValue: traceOutput,
        durationMs: Date.now() - traceStart,
        error: traceError,
      });
    }

    const finalTrace = traces[existingIdx >= 0 ? existingIdx : traces.length - 1];
    await hooks.onNodeEnd?.(finalTrace, Object.fromEntries(cache));
  }
}

// ─── Error workflow ───────────────────────────────────────────────────────────

async function triggerErrorWorkflow(
  sourceWorkflow: Workflow,
  errorMessage: string,
  encryptionSecret: string,
  adapter: WorkflowDbAdapter
): Promise<void> {
  const errorWf = adapter.getWorkflowById(sourceWorkflow.errorWorkflowId!);
  if (!errorWf) return;
  // Infinite-loop guard: error workflows must not themselves have an errorWorkflowId
  if (errorWf.errorWorkflowId != null) return;

  const syntheticBody = {
    error: errorMessage,
    workflow: { id: sourceWorkflow.id },
    timestamp: new Date().toISOString(),
  };

  // Run the error workflow with its own fresh (empty) hooks — never the source's.
  // The source's hooks close over a single shared executionId; forwarding them
  // here lets the error workflow's onWorkflowStart clobber that id, so the
  // source's onWorkflowEnd would finalize the wrong execution row and leave the
  // source's own row orphaned at status "running".
  await executeWorkflow(
    errorWf,
    syntheticBody,
    { method: "INTERNAL", url: "", rawBody: JSON.stringify(syntheticBody), ip: "" },
    new Headers({ "content-type": "application/json" }),
    encryptionSecret,
    adapter,
    {}
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Sentinel error returned when no edge reaches a workflowOutput node. This is a
 * workflow misconfiguration (client error → HTTP 400), not a runtime failure,
 * so callers should map it to 400 rather than 500.
 */
export const NO_OUTPUT_CONNECTED_ERROR = "No output node is connected";

export async function executeWorkflow(
  workflow: Workflow,
  body: Record<string, unknown>,
  reqCtx: ReqContext,
  reqHeaders: Headers,
  encryptionSecret: string,
  adapter: WorkflowDbAdapter,
  hooks: WorkflowHooks = {},
  subDepth = 0
): Promise<WorkflowExecutionResult> {
  // Arm the wall-clock deadline once, for the top-level run only. Sub-workflows
  // (subDepth > 0) inherit the parent's deadline through the shared reqCtx, so a
  // nested call chain cannot reset or outlast the original budget. A deadline an
  // upstream caller already set is respected and never overwritten.
  if (subDepth === 0 && reqCtx.deadlineAt === undefined) {
    const limit = executionTimeoutMs();
    if (limit > 0) reqCtx.deadlineAt = Date.now() + limit;
  }

  const outputNodes = workflow.nodes.filter((n) => n.type === "workflowOutput");
  const outputEdges = workflow.edges.filter((e) => outputNodes.some((o) => o.id === e.target));
  if (outputEdges.length === 0) {
    return { result: null, traces: [], error: NO_OUTPUT_CONNECTED_ERROR };
  }

  const customerVars = await loadCustomerVars(workflow.id, encryptionSecret, adapter);
  const evalCache    = new Map<string, EvalResult>();
  const evalVisiting = new Set<string>();
  const nodeTraces: NodeTrace[] = [];
  let result: EvalResult | null = null;
  let error: string | undefined;
  const startMs = Date.now();

  await hooks.onWorkflowStart?.(workflow, body);

  try {
    for (const outputEdge of outputEdges) {
      const sourceNode = workflow.nodes.find((n) => n.id === outputEdge.source);
      if (!sourceNode) continue;
      try {
        const r = await evaluateNode(
          sourceNode.id, outputEdge.sourceHandle,
          workflow, body, evalCache, evalVisiting, reqHeaders, customerVars, reqCtx, nodeTraces, encryptionSecret, adapter, hooks, subDepth
        );
        if (r.active !== false) { result = r; break; }
      } catch (err) {
        error = err instanceof WorkflowTimeoutError ? err.message : String(err);
        if (workflow.errorWorkflowId != null) {
          try {
            await triggerErrorWorkflow(workflow, error, encryptionSecret, adapter);
          } catch { /* swallow — must not override original error */ }
        }
        break;
      }
    }
  } finally {
    const executionResult: WorkflowExecutionResult = { result, traces: nodeTraces, error };
    await hooks.onWorkflowEnd?.(executionResult, Date.now() - startMs);
  }

  return { result, traces: nodeTraces, error };
}
