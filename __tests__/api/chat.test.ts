import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { ALL_MIGRATIONS } from "@/lib/db/migrations";
import { runMigrations } from "@/lib/db/run-migrations";
import { hashApiKey, deriveKeyPrefix } from "@/lib/security/api-keys";
import { requestFingerprint } from "@/lib/idempotency";

// Prevent fire-and-forget DB writes from interfering between tests
vi.stubGlobal("setImmediate", vi.fn());

vi.mock("@/lib/workflow-engine", () => ({
  executeWorkflow: vi.fn(),
  NO_OUTPUT_CONNECTED_ERROR: "No output node is connected",
  WORKFLOW_TIMEOUT_ERROR: "Workflow execution timed out",
  WORKFLOW_DEPTH_ERROR: "Workflow execution depth exceeded",
}));

vi.mock("@/lib/concurrency", () => ({
  executionSemaphore: {
    acquire: vi.fn(),
    release: vi.fn(),
    activeCount: 0,
    queueDepth: 0,
  },
}));

import { handleExecutionRequest } from "@/lib/execution-handler";
import { executeWorkflow } from "@/lib/workflow-engine";
import { executionSemaphore } from "@/lib/concurrency";
import type { WorkflowExecutionResult } from "@/lib/workflow-types";

process.env.ENCRYPTION_SECRET = "test-secret";

const OK_RESULT: WorkflowExecutionResult = {
  result: { value: "pong", active: true, inputTokens: 0, outputTokens: 0 },
  traces: [],
};

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  runMigrations(db, ALL_MIGRATIONS);
  return db;
}

function seedKey(
  db: DatabaseSync,
  opts: {
    isActive?: number;
    scopes?: string;
    expiresAt?: string | null;
    rateLimitOverride?: number | null;
    keyActive?: number;
  } = {},
): void {
  const {
    isActive = 1,
    scopes = '["execute"]',
    expiresAt = null,
    rateLimitOverride = null,
    keyActive = 1,
  } = opts;
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO workflows (slug, name, api_key, is_active) VALUES (?,?,?,?)`
  ).run("wf-slug", "Test WF", hashApiKey("sk-wf-legacy"), isActive) as { lastInsertRowid: number };
  // Keys are stored hashed; seed the hash + prefix of the raw key tests present.
  db.prepare(
    `INSERT INTO workflow_api_keys (workflow_id, key_hash, key_prefix, scopes, is_active, expires_at, rate_limit_override)
     VALUES (?,?,?,?,?,?,?)`
  ).run(Number(lastInsertRowid), hashApiKey("sk-wf-valid"), deriveKeyPrefix("sk-wf-valid"), scopes, keyActive, expiresAt, rateLimitOverride);
}

let db: DatabaseSync;

function call(apiKey: string | null, rawBody = "{}") {
  return handleExecutionRequest({ apiKey, rawBody, headers: new Headers(), ip: "127.0.0.1", db });
}

beforeEach(() => {
  db = makeDb();
  vi.mocked(executionSemaphore.acquire).mockResolvedValue(true);
  vi.mocked(executeWorkflow).mockResolvedValue(OK_RESULT);
});

describe("handleExecutionRequest — auth flow", () => {
  it("401 when Authorization header is missing", async () => {
    const { status } = await call(null);
    expect(status).toBe(401);
  });

  it("401 when API key is not in the database", async () => {
    const { status } = await call("sk-wf-does-not-exist");
    expect(status).toBe(401);
  });

  it("401 when key is inactive (is_active = 0 on workflow_api_keys)", async () => {
    seedKey(db, { keyActive: 0 });
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(401);
  });

  it("401 when API key has expired", async () => {
    seedKey(db, { expiresAt: "2000-01-01T00:00:00.000Z" });
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(401);
  });

  it("403 when key has no 'execute' scope", async () => {
    seedKey(db, { scopes: '["read"]' });
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(403);
  });

  it("403 when key has empty scopes array", async () => {
    seedKey(db, { scopes: "[]" });
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(403);
  });

  it("403 when workflow is not active", async () => {
    seedKey(db, { isActive: 0 });
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(403);
  });

  it("429 when per-key rate limit is already at the ceiling", async () => {
    seedKey(db, { rateLimitOverride: 5 });
    const keyRow = db.prepare(
      `SELECT id FROM workflow_api_keys WHERE key_hash = ?`
    ).get(hashApiKey("sk-wf-valid")) as { id: number };
    const windowStart = Math.floor(Date.now() / 60_000) * 60_000; // ms-aligned sliding window start
    db.prepare(
      `INSERT INTO rate_limit_counters (key, window_start, count) VALUES (?,?,5)`
    ).run(`apik:${keyRow.id}`, windowStart);
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(429);
  });

  it("still allows when count is one below the rate limit", async () => {
    seedKey(db, { rateLimitOverride: 3 });
    const keyRow = db.prepare(
      `SELECT id FROM workflow_api_keys WHERE key_hash = ?`
    ).get(hashApiKey("sk-wf-valid")) as { id: number };
    const windowStart = Math.floor(Date.now() / 60_000) * 60_000; // ms-aligned sliding window start
    db.prepare(
      `INSERT INTO rate_limit_counters (key, window_start, count) VALUES (?,?,2)`
    ).run(`apik:${keyRow.id}`, windowStart);
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(200);
  });

  it("503 when the execution semaphore is saturated", async () => {
    seedKey(db);
    vi.mocked(executionSemaphore.acquire).mockResolvedValue(false);
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(503);
  });

  it("400 when request body is malformed JSON", async () => {
    seedKey(db);
    const { status } = await call("sk-wf-valid", "not-valid-json{{{");
    expect(status).toBe(400);
  });

  it("200 with reply on the happy path", async () => {
    seedKey(db);
    const { status, body } = await call("sk-wf-valid");
    expect(status).toBe(200);
    expect((body as Record<string, unknown>).reply).toBe("pong");
  });

  it("embeds an object output directly in reply (not double-encoded)", async () => {
    seedKey(db);
    vi.mocked(executeWorkflow).mockResolvedValueOnce({
      result: { value: { key: "val", num: 42 }, active: true, inputTokens: 0, outputTokens: 0 },
      traces: [],
    });
    const { status, body } = await call("sk-wf-valid");
    expect(status).toBe(200);
    const reply = (body as Record<string, unknown>).reply;
    // reply must be the object itself, not a JSON-encoded string of it
    expect(typeof reply).toBe("object");
    expect(reply).toEqual({ key: "val", num: 42 });
    // Final serialization is single-encoded
    expect(JSON.stringify(body)).toBe('{"reply":{"key":"val","num":42}}');
  });

  it("stringifies a non-object, non-string output (number)", async () => {
    seedKey(db);
    vi.mocked(executeWorkflow).mockResolvedValueOnce({
      result: { value: 42, active: true, inputTokens: 0, outputTokens: 0 },
      traces: [],
    });
    const { status, body } = await call("sk-wf-valid");
    expect(status).toBe(200);
    expect((body as Record<string, unknown>).reply).toBe("42");
  });

  it("returns 400 (not 500) when no output node is connected (EDGE-01)", async () => {
    seedKey(db);
    vi.mocked(executeWorkflow).mockResolvedValueOnce({
      result: null,
      error: "No output node is connected",
      traces: [],
    });
    const { status, body } = await call("sk-wf-valid");
    expect(status).toBe(400);
    expect((body as Record<string, unknown>).error).toBe("No output node is connected");
  });

  it("still returns 500 for a genuine runtime execution error", async () => {
    seedKey(db);
    vi.mocked(executeWorkflow).mockResolvedValueOnce({
      result: null,
      error: "Custom Code runtime error: boom",
      traces: [],
    });
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(500);
  });

  it("returns 504 (not 500) when the execution deadline is exceeded", async () => {
    seedKey(db);
    vi.mocked(executeWorkflow).mockResolvedValueOnce({
      result: null,
      error: "Workflow execution timed out after 30000 ms",
      traces: [],
    });
    const { status, body } = await call("sk-wf-valid");
    expect(status).toBe(504);
    expect((body as Record<string, unknown>).error).toContain("timed out");
  });

  it("returns 400 (not 500) when the execution depth limit is exceeded", async () => {
    seedKey(db);
    vi.mocked(executeWorkflow).mockResolvedValueOnce({
      result: null,
      error: "Workflow execution depth exceeded (max 1000)",
      traces: [],
    });
    const { status, body } = await call("sk-wf-valid");
    expect(status).toBe(400);
    expect((body as Record<string, unknown>).error).toContain("depth exceeded");
  });

  it("200 when body is empty string (treated as empty object)", async () => {
    seedKey(db);
    const { status } = await call("sk-wf-valid", "");
    expect(status).toBe(200);
  });

  it("200 when body is whitespace only (treated as empty object)", async () => {
    seedKey(db);
    const { status } = await call("sk-wf-valid", "   \n\t ");
    expect(status).toBe(200);
  });

  it("key exactly at expiry boundary is treated as expired", async () => {
    // expires_at == now → expired (condition: <= new Date())
    const now = new Date().toISOString();
    seedKey(db, { expiresAt: now });
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(401);
  });

  it("key that expires in the future is accepted", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    seedKey(db, { expiresAt: future });
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(200);
  });
});

describe("handleExecutionRequest — idempotency keys", () => {
  // Reset call history (keeps the OK_RESULT implementation from the outer
  // beforeEach) so per-test execution counts are meaningful.
  beforeEach(() => { vi.mocked(executeWorkflow).mockClear(); });

  function callIdem(rawBody: string, idemKey: string | null) {
    const headers = new Headers();
    if (idemKey !== null) headers.set("Idempotency-Key", idemKey);
    return handleExecutionRequest({ apiKey: "sk-wf-valid", rawBody, headers, ip: "127.0.0.1", db });
  }

  it("replays the first response on a retry with the same key (no re-execution)", async () => {
    seedKey(db);
    const first = await callIdem('{"m":1}', "idem-1");
    expect(first.status).toBe(200);
    expect((first.body as Record<string, unknown>).reply).toBe("pong");
    expect(vi.mocked(executeWorkflow)).toHaveBeenCalledTimes(1);

    const second = await callIdem('{"m":1}', "idem-1");
    expect(second.status).toBe(200);
    expect((second.body as Record<string, unknown>).reply).toBe("pong");
    // Workflow was NOT executed again — the stored response was replayed.
    expect(vi.mocked(executeWorkflow)).toHaveBeenCalledTimes(1);
    expect(second.corsHeaders["Idempotency-Replayed"]).toBe("true");
  });

  it("422 when the same key is reused with a different request body", async () => {
    seedKey(db);
    await callIdem('{"m":1}', "idem-2");
    const reused = await callIdem('{"m":999}', "idem-2");
    expect(reused.status).toBe(422);
    expect((reused.body as Record<string, unknown>).error).toMatch(/different request body/);
  });

  it("409 when a request with the same key is still in progress", async () => {
    seedKey(db);
    const keyRow = db.prepare(
      `SELECT id FROM workflow_api_keys WHERE key_hash = ?`
    ).get(hashApiKey("sk-wf-valid")) as { id: number };
    // Simulate an in-flight request: an in_progress record with the SAME body
    // fingerprint already exists (so we hit the in-progress path, not the 422
    // fingerprint-mismatch path).
    db.prepare(
      `INSERT INTO idempotency_keys (api_key_id, idempotency_key, request_fingerprint, status, expires_at)
       VALUES (?, ?, ?, 'in_progress', ?)`
    ).run(keyRow.id, "idem-3", requestFingerprint("{}"), Date.now() + 60_000);
    const res = await callIdem("{}", "idem-3");
    expect(res.status).toBe(409);
  });

  it("does NOT cache a 5xx outcome — a retry re-executes", async () => {
    seedKey(db);
    vi.mocked(executeWorkflow).mockResolvedValueOnce({ result: null, error: "boom", traces: [] });
    const first = await callIdem("{}", "idem-4");
    expect(first.status).toBe(500);

    // Default mock returns OK again; the retry should re-run (record was released).
    const second = await callIdem("{}", "idem-4");
    expect(second.status).toBe(200);
    expect(vi.mocked(executeWorkflow)).toHaveBeenCalledTimes(2);
  });

  it("400 when the Idempotency-Key exceeds 255 characters", async () => {
    seedKey(db);
    const res = await callIdem("{}", "x".repeat(256));
    expect(res.status).toBe(400);
  });

  it("without an Idempotency-Key, repeated calls always execute (no record stored)", async () => {
    seedKey(db);
    await callIdem("{}", null);
    await callIdem("{}", null);
    expect(vi.mocked(executeWorkflow)).toHaveBeenCalledTimes(2);
    const count = db.prepare(`SELECT COUNT(*) AS n FROM idempotency_keys`).get() as { n: number };
    expect(count.n).toBe(0);
  });
});
