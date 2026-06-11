/**
 * Framework-agnostic workflow execution handler.
 *
 * Contains all the auth, rate-limiting, semaphore, and execution logic that
 * was previously inlined in /api/v1/chat/route.ts. Both the Next.js route
 * handler and the standalone execution server call this function — it has no
 * dependency on Next.js or any HTTP framework.
 */
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "@/lib/db";
import { executeWorkflow, NO_OUTPUT_CONNECTED_ERROR, WORKFLOW_TIMEOUT_ERROR, type Workflow } from "@/lib/workflow-engine";
import { createSqliteAdapter } from "@/lib/db/workflow-adapter";
import { createSqliteHooks } from "@/lib/db/workflow-hooks";
import { executionSemaphore } from "@/lib/concurrency";
import { hashApiKey } from "@/lib/security/api-keys";

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecutionResponse {
  status: number;
  body: unknown;
  corsHeaders: Record<string, string>;
}

interface ExecutionRequest {
  /** Bearer token extracted from the Authorization header, or null if absent. */
  apiKey: string | null;
  /** Raw (unparsed) request body string. */
  rawBody: string;
  /** Standard Web API Headers object. */
  headers: Headers;
  /** Caller IP address (may be empty string). */
  ip: string;
  /** HTTP method of the originating request (default: "POST"). */
  method?: string;
  /** Full URL of the originating request (default: ""). */
  url?: string;
  /** Optional explicit DatabaseSync instance. Defaults to getDb(). */
  db?: DatabaseSync;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleExecutionRequest(
  req: ExecutionRequest,
): Promise<ExecutionResponse> {
  const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET ?? "";

  function fail(body: unknown, status: number): ExecutionResponse {
    return { status, body, corsHeaders: CORS_HEADERS };
  }

  const { apiKey, rawBody, headers, ip } = req;
  const db = req.db ?? getDb();

  // ── 1. Auth header required ────────────────────────────────────────────────
  if (!apiKey) return fail({ error: "Missing Authorization header" }, 401);

  // ── 2. Key lookup (join workflows so we get workflow data in one query) ────
  // Keys are stored hashed; look up by the hash of the presented key, never the
  // raw value. A constant-length SHA-256 hex lookup also sidesteps key-length
  // side channels in the index probe.
  const keyRow = db.prepare(
    `SELECT k.id as key_id, k.scopes, k.expires_at, k.rate_limit_override,
            w.id, w.nodes, w.edges, w.is_active, w.error_workflow_id
     FROM workflow_api_keys k
     JOIN workflows w ON w.id = k.workflow_id
     WHERE k.key_hash = ? AND k.is_active = 1`
  ).get(hashApiKey(apiKey)) as unknown as {
    key_id: number;
    scopes: string;
    expires_at: string | null;
    rate_limit_override: number | null;
    id: number;
    nodes: string;
    edges: string;
    is_active: number;
    error_workflow_id: number | null;
  } | undefined;

  if (!keyRow) return fail({ error: "Invalid API key" }, 401);

  // ── 3. Expiry check ────────────────────────────────────────────────────────
  if (keyRow.expires_at && new Date(keyRow.expires_at) <= new Date()) {
    return fail({ error: "API key has expired" }, 401);
  }

  // ── 4. Scope check ─────────────────────────────────────────────────────────
  const scopes: string[] = JSON.parse(keyRow.scopes);
  if (!scopes.includes("execute")) {
    return fail({ error: "API key does not have execute scope" }, 403);
  }

  // ── 5. Workflow must be active ─────────────────────────────────────────────
  if (!keyRow.is_active) return fail({ error: "This workflow is not active" }, 403);

  // ── 6. Per-key rate limiting (fixed 1-minute window) ──────────────────────
  if (keyRow.rate_limit_override != null) {
    const windowKey = `apik:${keyRow.key_id}`;
    const windowStart = Math.floor(Date.now() / 60_000);
    const limitRow = db.prepare(
      `SELECT count FROM rate_limit_counters WHERE key = ? AND window_start = ?`
    ).get(windowKey, windowStart) as { count: number } | undefined;
    if ((limitRow?.count ?? 0) >= keyRow.rate_limit_override) {
      return fail({ error: "Rate limit exceeded for this API key" }, 429);
    }
    db.prepare(
      `INSERT INTO rate_limit_counters (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`
    ).run(windowKey, windowStart);
  }

  // ── 7. Update last_used_at (fire-and-forget, non-critical) ─────────────────
  const capturedKeyId = keyRow.key_id;
  setImmediate(() => {
    try {
      db.prepare(
        `UPDATE workflow_api_keys SET last_used_at = datetime('now') WHERE id = ?`
      ).run(capturedKeyId);
    } catch { /* non-critical */ }
  });

  // ── 8. Build workflow object ───────────────────────────────────────────────
  const workflow: Workflow = {
    id: keyRow.id,
    nodes: JSON.parse(keyRow.nodes),
    edges: JSON.parse(keyRow.edges),
    is_active: keyRow.is_active,
    errorWorkflowId: keyRow.error_workflow_id ?? null,
  };

  // ── 9. Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = rawBody.trim() ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    return fail({ error: "Invalid JSON body" }, 400);
  }

  // ── 10. Semaphore ─────────────────────────────────────────────────────────
  const acquired = await executionSemaphore.acquire();
  if (!acquired) {
    return fail(
      {
        error: "Server busy, try again shortly",
        activeExecutions: executionSemaphore.activeCount,
        queueDepth: executionSemaphore.queueDepth,
      },
      503,
    );
  }

  // ── 11. Execute ───────────────────────────────────────────────────────────
  const adapter = createSqliteAdapter(db);
  const hooks = createSqliteHooks(db, workflow.id, capturedKeyId, adapter);

  let result: Awaited<ReturnType<typeof executeWorkflow>>["result"];
  let error: Awaited<ReturnType<typeof executeWorkflow>>["error"];
  try {
    ({ result, error } = await executeWorkflow(
      workflow,
      body,
      { method: req.method ?? "POST", url: req.url ?? "", rawBody, ip },
      headers,
      ENCRYPTION_SECRET,
      adapter,
      hooks,
    ));
  } finally {
    executionSemaphore.release();
  }

  // ── 12. Format result ─────────────────────────────────────────────────────
  // A disconnected output is a workflow misconfiguration (client error), not a
  // runtime failure — surface it as 400, like the no-active-path case below. A
  // blown execution deadline maps to 504 (Gateway Timeout) so callers can tell
  // "the pipeline took too long" apart from a genuine 500.
  if (error) {
    if (error === NO_OUTPUT_CONNECTED_ERROR) return fail({ error }, 400);
    if (error.includes(WORKFLOW_TIMEOUT_ERROR)) return fail({ error }, 504);
    return fail({ error }, 500);
  }
  if (!result) return fail({ error: "No active path reached any output node" }, 400);

  const rv = result.value;

  // ResponseBuilder node: honour custom status + headers
  if (rv !== null && typeof rv === "object" && (rv as Record<string, unknown>).__rb === true) {
    const rb = rv as { status: number; headers: Record<string, string>; body: unknown };
    const bodyStr =
      rb.body === undefined || rb.body === null ? "" :
      typeof rb.body === "string" ? rb.body :
      JSON.stringify(rb.body);

    const userHeaders = rb.headers ?? {};
    const hasContentType = Object.keys(userHeaders).some(
      (k) => k.toLowerCase() === "content-type"
    );
    let autoContentType = "";
    if (!hasContentType && bodyStr) {
      try { JSON.parse(bodyStr); autoContentType = "application/json"; }
      catch { autoContentType = "text/plain; charset=utf-8"; }
    }

    return {
      status: rb.status,
      body: bodyStr,
      corsHeaders: {
        ...CORS_HEADERS,
        ...(autoContentType ? { "Content-Type": autoContentType } : {}),
        ...userHeaders,
      },
    };
  }

  const reply =
    rv === undefined || rv === null ? "" :
    typeof rv === "object" ? rv :
    String(rv);
  return { status: 200, body: { reply }, corsHeaders: CORS_HEADERS };
}
