import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { ALL_MIGRATIONS } from "@/lib/db/migrations";
import { runMigrations } from "@/lib/db/run-migrations";

// Prevent fire-and-forget DB writes from interfering between tests
vi.stubGlobal("setImmediate", vi.fn());

vi.mock("@/lib/workflow-engine", () => ({
  executeWorkflow: vi.fn(),
  NO_OUTPUT_CONNECTED_ERROR: "No output node is connected",
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
  ).run("wf-slug", "Test WF", "sk-wf-legacy", isActive) as { lastInsertRowid: number };
  db.prepare(
    `INSERT INTO workflow_api_keys (workflow_id, key, scopes, is_active, expires_at, rate_limit_override)
     VALUES (?,?,?,?,?,?)`
  ).run(Number(lastInsertRowid), "sk-wf-valid", scopes, keyActive, expiresAt, rateLimitOverride);
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
      `SELECT id FROM workflow_api_keys WHERE key = ?`
    ).get("sk-wf-valid") as { id: number };
    const windowStart = Math.floor(Date.now() / 60_000);
    db.prepare(
      `INSERT INTO rate_limit_counters (key, window_start, count) VALUES (?,?,5)`
    ).run(`apik:${keyRow.id}`, windowStart);
    const { status } = await call("sk-wf-valid");
    expect(status).toBe(429);
  });

  it("still allows when count is one below the rate limit", async () => {
    seedKey(db, { rateLimitOverride: 3 });
    const keyRow = db.prepare(
      `SELECT id FROM workflow_api_keys WHERE key = ?`
    ).get("sk-wf-valid") as { id: number };
    const windowStart = Math.floor(Date.now() / 60_000);
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
