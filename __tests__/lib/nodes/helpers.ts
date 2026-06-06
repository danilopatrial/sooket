import type { NodeContext } from "@/lib/nodes/types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";

export function makeNode(type: string, data: Record<string, unknown> = {}): WorkflowNode {
  return { id: "node-1", type, data };
}

export function ok(value: unknown, inputTokens = 0, outputTokens = 0): EvalResult {
  return { value, inputTokens, outputTokens };
}

export function inactive(): EvalResult {
  return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
}

/** Build a NodeContext with sensible defaults. Any field can be overridden. */
export function makeCtx(overrides: Partial<NodeContext> = {}): NodeContext {
  return {
    nodeId: "node-1",
    workflow: { id: 1, nodes: [], edges: [], is_active: 1 },
    body: {},
    cache: new Map(),
    reqHeaders: new Headers(),
    vars: new Map(),
    reqCtx: { method: "POST", url: "http://localhost/api/v1/chat", rawBody: "", ip: "127.0.0.1" },
    encryptionSecret: "test-secret",
    inputFor: () => null,
    inputForError: () => null,
    evalInput: async () => ok(undefined),
    getProviderKey: async () => null,
    getAccessList: () => [],
    addAccessListEntry: () => {},
    removeAccessListEntry: () => {},
    getCacheEntry: () => null,
    setCacheEntry: () => {},
    evictExpiredCacheEntries: () => {},
    incrementRateLimitCounter: () => 1,
    evictExpiredRateLimitCounters: () => {},
    getSemanticCacheEntries: () => [],
    insertSemanticCacheEntry: () => {},
    evictExpiredSemanticCacheEntries: () => {},
    getStaticData: () => undefined,
    setStaticData: () => {},
    ...overrides,
  };
}

/**
 * Returns an `inputFor` that resolves the given handle to a fake upstream node,
 * and an `evalInput` that resolves that fake node to the given value.
 */
export function wireInput(
  handle: string,
  value: unknown,
  tokens: { inputTokens?: number; outputTokens?: number } = {}
): Pick<NodeContext, "inputFor" | "evalInput"> {
  const fakeNode: WorkflowNode = { id: `upstream-${handle}`, type: "text", data: {} };
  return {
    inputFor: (h) => (h === handle ? { node: fakeNode, sourceHandle: null, connectionType: "main" as const } : null),
    evalInput: async () => ({ value, inputTokens: tokens.inputTokens ?? 0, outputTokens: tokens.outputTokens ?? 0 }),
  };
}

/**
 * Wire multiple handles at once. Each entry maps a handle name to a value.
 * evalInput resolves by looking at which fake node is passed.
 */
export function wireInputs(
  entries: Record<string, unknown>
): Pick<NodeContext, "inputFor" | "evalInput"> {
  const nodeMap = new Map<string, unknown>();
  const handleToNode = new Map<string, WorkflowNode>();
  for (const [handle, value] of Object.entries(entries)) {
    const fakeNode: WorkflowNode = { id: `upstream-${handle}`, type: "text", data: {} };
    handleToNode.set(handle, fakeNode);
    nodeMap.set(fakeNode.id, value);
  }
  return {
    inputFor: (h) => {
      if (h === null) return null;
      const n = handleToNode.get(h);
      return n ? { node: n, sourceHandle: null, connectionType: "main" as const } : null;
    },
    evalInput: async (src) => {
      const val = nodeMap.get(src.node.id);
      return { value: val, inputTokens: 0, outputTokens: 0 };
    },
  };
}
