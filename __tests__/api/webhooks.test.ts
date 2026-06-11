import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { ALL_MIGRATIONS } from "@/lib/db/migrations";
import { runMigrations } from "@/lib/db/run-migrations";

vi.mock("next/server", () => ({
  NextResponse: {
    json(body: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, json: async () => body };
    },
  },
}));

// Provide the in-memory DB to the route via getDb mock
const dbHolder = { current: null as DatabaseSync | null };
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => dbHolder.current!),
}));

vi.mock("@/lib/db/workflow-adapter", () => ({
  createSqliteAdapter: vi.fn(() => ({})),
}));

vi.mock("@/lib/db/workflow-hooks", () => ({
  createSqliteHooks: vi.fn(() => ({})),
}));

vi.mock("@/lib/workflow-engine", () => ({
  executeWorkflow: vi.fn(),
}));

vi.mock("@/lib/concurrency", () => ({
  executionSemaphore: {
    acquire: vi.fn().mockResolvedValue(true),
    release: vi.fn(),
    activeCount: 0,
    queueDepth: 0,
  },
}));

vi.mock("@/lib/request-limit", () => ({
  readLimitedText: vi.fn().mockResolvedValue("{}"),
  maxBodyBytes: vi.fn().mockReturnValue(1_048_576),
  RequestBodyTooLargeError: class RequestBodyTooLargeError extends Error {
    limit: number;
    constructor(limit: number) {
      super("too large");
      this.limit = limit;
    }
  },
}));

import { POST } from "@/app/api/webhooks/[slug]/route";
import { executeWorkflow } from "@/lib/workflow-engine";
import type { WorkflowExecutionResult } from "@/lib/workflow-types";

process.env.ENCRYPTION_SECRET = "test-secret";

const OK_RESULT: WorkflowExecutionResult = {
  result: { value: "ok", active: true, inputTokens: 0, outputTokens: 0 },
  traces: [],
};

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  runMigrations(db, ALL_MIGRATIONS);
  return db;
}

function seedWorkflow(
  db: DatabaseSync,
  { isActive = 1, token = null as string | null } = {},
): void {
  db.prepare(
    `INSERT INTO workflows (slug, name, api_key, is_active, webhook_token) VALUES (?,?,?,?,?)`
  ).run("wf-slug", "Test WF", "sk-wf-x", isActive, token);
}

function makeReq(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method: "POST", headers });
}

function params(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  dbHolder.current = makeDb();
  vi.mocked(executeWorkflow).mockResolvedValue(OK_RESULT);
});

describe("POST /api/webhooks/[slug] — token verification", () => {
  it("404 when workflow does not exist", async () => {
    const res = await POST(makeReq("http://localhost/api/webhooks/no-such"), params("no-such"));
    expect(res.status).toBe(404);
  });

  it("403 when workflow exists but is not active (no token)", async () => {
    seedWorkflow(dbHolder.current!, { isActive: 0 });
    const res = await POST(makeReq("http://localhost/api/webhooks/wf-slug"), params("wf-slug"));
    expect(res.status).toBe(403);
  });

  it("200 when workflow has no token configured and is active", async () => {
    seedWorkflow(dbHolder.current!, { token: null, isActive: 1 });
    const res = await POST(makeReq("http://localhost/api/webhooks/wf-slug"), params("wf-slug"));
    expect(res.status).toBe(200);
  });

  it("401 when token is configured but request provides no token", async () => {
    seedWorkflow(dbHolder.current!, { token: "secret-token" });
    const res = await POST(makeReq("http://localhost/api/webhooks/wf-slug"), params("wf-slug"));
    expect(res.status).toBe(401);
  });

  it("401 when token is configured and request provides wrong header token", async () => {
    seedWorkflow(dbHolder.current!, { token: "correct-token" });
    const res = await POST(
      makeReq("http://localhost/api/webhooks/wf-slug", { "x-webhook-secret": "wrong-token" }),
      params("wf-slug"),
    );
    expect(res.status).toBe(401);
  });

  it("401 when token is configured and request provides wrong query-param token", async () => {
    seedWorkflow(dbHolder.current!, { token: "correct-token" });
    const res = await POST(
      makeReq("http://localhost/api/webhooks/wf-slug?token=wrong"),
      params("wf-slug"),
    );
    expect(res.status).toBe(401);
  });

  it("200 when correct token is provided via x-webhook-secret header", async () => {
    seedWorkflow(dbHolder.current!, { token: "secret" });
    const res = await POST(
      makeReq("http://localhost/api/webhooks/wf-slug", { "x-webhook-secret": "secret" }),
      params("wf-slug"),
    );
    expect(res.status).toBe(200);
  });

  it("rejects a wrong token of the SAME length (constant-time compare returns false, not by length)", async () => {
    seedWorkflow(dbHolder.current!, { token: "abcd1234" });
    const res = await POST(
      makeReq("http://localhost/api/webhooks/wf-slug", { "x-webhook-secret": "abcd9999" }),
      params("wf-slug"),
    );
    expect(res.status).toBe(401);
  });

  it("accepts the correct token (same byte length path through the constant-time compare)", async () => {
    seedWorkflow(dbHolder.current!, { token: "abcd1234" });
    const res = await POST(
      makeReq("http://localhost/api/webhooks/wf-slug", { "x-webhook-secret": "abcd1234" }),
      params("wf-slug"),
    );
    expect(res.status).toBe(200);
  });

  it("200 when correct token is provided via ?token= query param", async () => {
    seedWorkflow(dbHolder.current!, { token: "secret" });
    const res = await POST(
      makeReq("http://localhost/api/webhooks/wf-slug?token=secret"),
      params("wf-slug"),
    );
    expect(res.status).toBe(200);
  });

  it("401 precedes 403 — token is checked before active state is revealed", async () => {
    // Workflow is inactive but has a token configured; wrong token → 401, not 403
    seedWorkflow(dbHolder.current!, { token: "secret", isActive: 0 });
    const res = await POST(
      makeReq("http://localhost/api/webhooks/wf-slug", { "x-webhook-secret": "wrong" }),
      params("wf-slug"),
    );
    expect(res.status).toBe(401);
  });

  it("403 when correct token is provided but workflow is inactive", async () => {
    seedWorkflow(dbHolder.current!, { token: "secret", isActive: 0 });
    const res = await POST(
      makeReq("http://localhost/api/webhooks/wf-slug", { "x-webhook-secret": "secret" }),
      params("wf-slug"),
    );
    expect(res.status).toBe(403);
  });
});
