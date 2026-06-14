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
import { executeWorkflow, NO_OUTPUT_CONNECTED_ERROR, WORKFLOW_TIMEOUT_ERROR, WORKFLOW_DEPTH_ERROR, type Workflow } from "@/lib/workflow-engine";
import { createSqliteAdapter } from "@/lib/db/workflow-adapter";
import { createSqliteHooks } from "@/lib/db/workflow-hooks";
import { executionSemaphore } from "@/lib/concurrency";
import { hashApiKey } from "@/lib/security/api-keys";
import { sanitizeExecutionError } from "@/lib/security/error-sanitize";
import { consumeSlidingWindow } from "@/lib/rate-limit";
import {
  extractIdempotencyKey,
  requestFingerprint,
  findIdempotencyRecord,
  reserveIdempotency,
  completeIdempotency,
  releaseIdempotency,
  evictExpiredIdempotency,
  idempotencyTtlMs,
  MAX_IDEMPOTENCY_KEY_LENGTH,
  type IdempotencyRecord,
} from "@/lib/idempotency";

// ─── CORS ─────────────────────────────────────────────────────────────────────

// Cross-origin browser access is DENY by default: no `Access-Control-Allow-Origin`
// is emitted unless the operator opts in via `CORS_ORIGIN`. Set it to `*` to allow
// any origin (the historical default), or to one or more specific origins
// (comma-separated) to allow only those — the request's `Origin` is then reflected
// back when it matches, with `Vary: Origin`. Non-browser callers (Bearer key,
// server-to-server) are unaffected; CORS only governs browser cross-origin reads.

type CorsMode =
  | { kind: "deny" }
  | { kind: "wildcard" }
  | { kind: "list"; origins: Set<string> };

/** Resolve the CORS policy from `CORS_ORIGIN` (read at call time so it's testable). */
function corsMode(): CorsMode {
  const value = process.env.CORS_ORIGIN?.trim();
  if (!value) return { kind: "deny" };
  if (value === "*") return { kind: "wildcard" };
  const origins = value.split(",").map((o) => o.trim()).filter(Boolean);
  if (origins.length === 0) return { kind: "deny" };
  return { kind: "list", origins: new Set(origins) };
}

const CORS_BASE: Record<string, string> = {
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

/**
 * Build the CORS headers for one response. `Access-Control-Allow-Origin` is
 * added only when the policy allows it: always for `*` (wildcard), or — in
 * allowlist mode — when `requestOrigin` is one of the configured origins (then
 * reflected back, with `Vary: Origin`). The default (deny) and any unmatched
 * origin get no ACAO, so the browser blocks the cross-origin read.
 */
export function corsHeaders(requestOrigin?: string | null): Record<string, string> {
  const mode = corsMode();
  if (mode.kind === "wildcard") {
    return { ...CORS_BASE, "Access-Control-Allow-Origin": "*" };
  }
  if (mode.kind === "list") {
    const headers: Record<string, string> = { ...CORS_BASE, Vary: "Origin" };
    if (requestOrigin && mode.origins.has(requestOrigin)) {
      headers["Access-Control-Allow-Origin"] = requestOrigin;
    }
    return headers;
  }
  return { ...CORS_BASE };
}

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

  // Resolve CORS once per request from the caller's Origin (default-deny unless
  // CORS_ORIGIN opts in). Reused for every response below.
  const cors = corsHeaders(req.headers.get("origin"));

  function fail(body: unknown, status: number): ExecutionResponse {
    return { status, body, corsHeaders: cors };
  }

  /** Rebuild a stored response for an idempotent replay, flagged for the caller. */
  function replayResponse(rec: IdempotencyRecord): ExecutionResponse {
    const body = rec.response_body !== null ? JSON.parse(rec.response_body) : null;
    const storedHeaders: Record<string, string> =
      rec.response_headers !== null ? JSON.parse(rec.response_headers) : {};
    return {
      status: rec.response_status ?? 200,
      body,
      corsHeaders: { ...storedHeaders, "Idempotency-Replayed": "true" },
    };
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

  // ── 5b. Idempotency replay check (opt-in via Idempotency-Key) ──────────────
  // Done before rate limiting / semaphore so a retry returns the cached result
  // without consuming a slot or quota. Scoped to this API key.
  const idemKey = extractIdempotencyKey(headers);
  if (idemKey !== null) {
    if (idemKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      return fail({ error: `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters` }, 400);
    }
    const existing = findIdempotencyRecord(db, keyRow.key_id, idemKey, Date.now());
    if (existing) {
      if (existing.request_fingerprint !== requestFingerprint(rawBody)) {
        return fail({ error: "Idempotency-Key was already used with a different request body" }, 422);
      }
      if (existing.status === "completed") return replayResponse(existing);
      return fail({ error: "A request with this Idempotency-Key is already in progress" }, 409);
    }
  }

  // ── 6. Per-key rate limiting (sliding 1-minute window) ────────────────────
  // Shares consumeSlidingWindow with the Rate Limiter node so both enforce the
  // same boundary-safe semantics. The store's three calls are synchronous, so
  // the read-decide-increment is atomic for this single-threaded process.
  if (keyRow.rate_limit_override != null) {
    const store = {
      getRateLimitCount: (key: string, windowStart: number): number => {
        const row = db.prepare(
          `SELECT count FROM rate_limit_counters WHERE key = ? AND window_start = ?`
        ).get(key, windowStart) as { count: number } | undefined;
        return row?.count ?? 0;
      },
      incrementRateLimitCounter: (key: string, windowStart: number): number => {
        db.prepare(
          `INSERT INTO rate_limit_counters (key, window_start, count) VALUES (?, ?, 1)
           ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`
        ).run(key, windowStart);
        return 0;
      },
    };
    const decision = consumeSlidingWindow(
      store, `apik:${keyRow.key_id}`, Date.now(), 60_000, keyRow.rate_limit_override,
    );
    if (!decision.allowed) {
      return fail({ error: "Rate limit exceeded for this API key" }, 429);
    }
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

  // ── 10b. Reserve the idempotency record now that we hold a slot ────────────
  // The UNIQUE(api_key_id, key) insert is the concurrency guard: if another
  // request reserved it between the replay check and here, the insert fails and
  // we 409 (or replay if it already completed). Release the slot on that path.
  let idemRecordId: number | null = null;
  if (idemKey !== null) {
    idemRecordId = reserveIdempotency(db, capturedKeyId, idemKey, requestFingerprint(rawBody), Date.now(), idempotencyTtlMs());
    if (idemRecordId === null) {
      executionSemaphore.release();
      const existing = findIdempotencyRecord(db, capturedKeyId, idemKey, Date.now());
      if (existing && existing.status === "completed" && existing.request_fingerprint === requestFingerprint(rawBody)) {
        return replayResponse(existing);
      }
      return fail({ error: "A request with this Idempotency-Key is already in progress" }, 409);
    }
    setImmediate(() => { try { evictExpiredIdempotency(db, Date.now()); } catch { /* non-critical */ } });
  }

  // Persist (or, on a 5xx, release) the reserved record, then return the response.
  // A server error is treated as transient — the record is dropped so a retry can
  // re-execute rather than replaying the failure forever.
  const finalize = (response: ExecutionResponse): ExecutionResponse => {
    if (idemRecordId !== null) {
      if (response.status >= 500) {
        releaseIdempotency(db, idemRecordId);
      } else {
        completeIdempotency(
          db, idemRecordId, response.status,
          JSON.stringify(response.body ?? null),
          JSON.stringify(response.corsHeaders),
        );
      }
    }
    return response;
  };

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
  // Every execution-outcome return is routed through finalize() so the
  // idempotency record (if any) is persisted or released exactly once.
  //
  // A disconnected output is a workflow misconfiguration (client error), not a
  // runtime failure — surface it as 400, like the no-active-path case below. A
  // blown execution deadline maps to 504 (Gateway Timeout) so callers can tell
  // "the pipeline took too long" apart from a genuine 500.
  if (error) {
    if (error === NO_OUTPUT_CONNECTED_ERROR) return finalize(fail({ error }, 400));
    if (error.includes(WORKFLOW_TIMEOUT_ERROR)) return finalize(fail({ error }, 504));
    // A graph too deep to evaluate is a workflow-structure (client) error, not a
    // runtime fault — surface 400 so it's distinct from a genuine 500.
    if (error.includes(WORKFLOW_DEPTH_ERROR)) return finalize(fail({ error }, 400));
    // Any other failure is unexpected and may carry internal detail (upstream
    // provider bodies, stack traces, paths) — sanitise to a generic message +
    // correlation id before it crosses the trust boundary. The full error stays
    // in the execution record (Logs tab) and is logged under the same id.
    const { message, logId } = sanitizeExecutionError(error);
    return finalize(fail({ error: message, logId }, 500));
  }
  if (!result) return finalize(fail({ error: "No active path reached any output node" }, 400));

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

    return finalize({
      status: rb.status,
      body: bodyStr,
      corsHeaders: {
        ...cors,
        ...(autoContentType ? { "Content-Type": autoContentType } : {}),
        ...userHeaders,
      },
    });
  }

  const reply =
    rv === undefined || rv === null ? "" :
    typeof rv === "object" ? rv :
    String(rv);
  return finalize({ status: 200, body: { reply }, corsHeaders: cors });
}
