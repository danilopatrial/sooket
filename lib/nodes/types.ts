import type { WorkflowNode, Workflow, EvalResult, ReqContext } from "@/lib/workflow-types";

export interface NodeContext {
  nodeId: string;
  workflow: Workflow;
  body: Record<string, unknown>;
  cache: Map<string, EvalResult>;
  reqHeaders: Headers;
  vars: Map<string, string>;
  reqCtx: ReqContext;
  encryptionSecret: string;
  inputFor: (handle: string | null) => { node: WorkflowNode; sourceHandle: string | null | undefined; connectionType?: "main" | "error" } | null;
  /** Introspection helper — returns the error-typed incoming source for a handle, if any. Normal nodes do not need to call this; use inputFor instead. */
  inputForError: (handle: string | null) => { node: WorkflowNode; sourceHandle: string | null | undefined; connectionType?: "error" } | null;
  evalInput: (src: { node: WorkflowNode; sourceHandle: string | null | undefined; connectionType?: "main" | "error" }) => Promise<EvalResult>;

  // Provider keys — returns decrypted key or null when not configured
  getProviderKey(provider: string): Promise<string | null>;

  // Access-list operations (workflow-scoped)
  getAccessList(): string[];
  addAccessListEntry(value: string, ruleType: string): void;
  removeAccessListEntry(value: string): void;

  // Key-value cache (node_cache table)
  getCacheEntry(key: string, now: number): string | null;
  setCacheEntry(key: string, value: string, expiresAt: number): void;
  evictExpiredCacheEntries(now: number): void;

  // Rate-limit counters
  incrementRateLimitCounter(key: string, windowStart: number): number;
  evictExpiredRateLimitCounters(windowStart: number): void;

  // Semantic cache
  getSemanticCacheEntries(now: number): Array<{ id: number; embedding: string; value: string }>;
  insertSemanticCacheEntry(embedding: string, value: string, expiresAt: number): void;
  evictExpiredSemanticCacheEntries(now: number): void;

  // Static data — per-workflow store that persists across executions
  getStaticData(key: string): unknown;
  setStaticData(key: string, value: unknown): void;

  // Binary data externalization
  executionId?: string;
  binaryData?: import("@/lib/binary-data").BinaryDataService;

  /** Execute another workflow by slug and return its output. Returns an error result on failure. Max recursion depth: 5. */
  executeSubWorkflow?: (slug: string, input: Record<string, unknown>) => Promise<EvalResult>;
}

export interface INodeExecutor {
  execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext): Promise<EvalResult>;
}

export type NodeVersionRegistry = Record<string, Record<number, INodeExecutor>>;

/** @deprecated Use INodeExecutor instead */
export type NodeExecutor = (
  node: WorkflowNode,
  sourceHandle: string | null | undefined,
  ctx: NodeContext
) => Promise<EvalResult>;
