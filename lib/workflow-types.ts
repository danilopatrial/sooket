export interface WorkflowNode {
  id: string;
  type: string;
  /** Executor version to use. Absent or undefined defaults to 1 (backwards compatible). */
  typeVersion?: number;
  data: Record<string, unknown>;
  /** When true the node is skipped during execution; its upstream edges pass through transparently. */
  disabled?: boolean;
}

export type ConnectionType = "main" | "error";

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  /** Omitted or undefined is treated as "main" (backwards compatible). */
  connectionType?: ConnectionType;
}

export interface Workflow {
  id: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  is_active: number;
  errorWorkflowId?: number | null;
  pinData?: Record<string, EvalResult>;
  staticData?: Record<string, unknown>;
}

export interface EvalResult {
  value: unknown;
  inputTokens: number;
  outputTokens: number;
  model?: string;
  active?: boolean;
}

export interface ReqContext {
  method: string;
  url: string;
  rawBody: string;
  ip: string;
  /**
   * Absolute wall-clock deadline (ms since epoch) for the whole execution. The
   * engine checks it at every node boundary and aborts with a
   * `WorkflowTimeoutError` once passed. Set automatically by `executeWorkflow`
   * for top-level runs from `EXECUTION_TIMEOUT_MS`; sub-workflows inherit the
   * same value through the shared context so a deep call chain can't outlast it.
   */
  deadlineAt?: number;
}

export interface WorkflowExecutionResult {
  result: EvalResult | null;
  traces: import("@/lib/node-trace").NodeTrace[];
  error?: string;
}

export interface IRunExecutionData {
  /** Serializable snapshot of the evalCache — maps cacheKey to EvalResult */
  nodeOutputs: Record<string, EvalResult>;
  /** The nodeId of the last node that completed */
  lastCompletedNodeId: string;
  /** ISO timestamp of when execution started */
  startedAt: string;
  /** Current status */
  status: "running" | "completed" | "failed" | "waiting";
  /** Set when status is "failed" */
  error?: string;
}

export interface WorkflowHooks {
  /** Called once before graph traversal starts. */
  onWorkflowStart?(workflow: Workflow, body: Record<string, unknown>): void | Promise<void>;
  /** Called once after graph traversal completes, whether success or error. */
  onWorkflowEnd?(result: WorkflowExecutionResult, latencyMs: number): void | Promise<void>;
  /** Called before each individual node executes. */
  onNodeStart?(nodeId: string, nodeType: string): void | Promise<void>;
  /** Called after each individual node executes (in the finally block of evaluateNode). */
  onNodeEnd?(trace: import("@/lib/node-trace").NodeTrace, cacheSnapshot: Record<string, EvalResult>): void | Promise<void>;
  /** Returns the current execution ID set by onWorkflowStart, or undefined if not yet started. */
  getExecutionId?(): string | undefined;
}

/**
 * All database operations the workflow engine needs, supplied by the caller.
 * Decryption remains in the engine (pure crypto); storage is fully abstracted here.
 */
export interface WorkflowDbAdapter {
  // Customer variables — returns raw encrypted values; engine decrypts
  getCustomerVars(workflowId: number): Array<{ name: string; encryptedValue: string }>;

  // Provider keys — returns raw encrypted key or null; engine decrypts
  getEncryptedProviderKey(workflowId: number, provider: string): string | null;

  // Access list
  getAccessList(workflowId: number): string[];
  addAccessListEntry(workflowId: number, value: string, ruleType: string): void;
  removeAccessListEntry(workflowId: number, value: string): void;

  // Key-value cache (node_cache table)
  getCacheEntry(key: string, now: number): string | null;
  setCacheEntry(key: string, value: string, expiresAt: number): void;
  evictExpiredCacheEntries(now: number): void;

  // Rate-limit counters
  incrementRateLimitCounter(key: string, windowStart: number): number;
  evictExpiredRateLimitCounters(windowStart: number): void;

  // Semantic cache
  getSemanticCacheEntries(workflowId: number, now: number): Array<{ id: number; embedding: string; value: string }>;
  insertSemanticCacheEntry(workflowId: number, embedding: string, value: string, expiresAt: number): void;
  evictExpiredSemanticCacheEntries(now: number): void;

  // Execution state
  createExecution(workflowId: number, startedAt: string): number;
  updateExecution(executionId: number, data: IRunExecutionData): void;
  linkExecutionToRequestLog(executionId: number, requestLogId: number): void;

  // Static data — per-workflow persistent key-value store
  getStaticData(workflowId: number): Record<string, unknown>;
  saveStaticData(workflowId: number, data: Record<string, unknown>): void;

  // Workflow lookup (used by error workflow triggering and sub-workflow node)
  getWorkflowById(id: number): Workflow | null;
  getWorkflowBySlug(slug: string): Workflow | null;

  // Shared credentials
  listCredentials(): Array<{ id: number; name: string; type: string; createdAt: string }>;
  upsertCredential(name: string, type: string, encryptedData: string): number;
  deleteCredential(id: number): void;
  linkCredential(workflowId: number, nodeId: string, credentialId: number): void;
  unlinkCredential(workflowId: number, nodeId: string): void;
  getLinkedCredential(workflowId: number, nodeId: string): string | null;
}
