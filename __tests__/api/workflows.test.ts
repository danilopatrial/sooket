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

const dbHolder = { current: null as DatabaseSync | null };
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => dbHolder.current!),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-slug-001"),
}));

import { POST as createWorkflow, GET as listWorkflows } from "@/app/api/workflows/route";
import {
  GET as getWorkflow,
  DELETE as deleteWorkflow,
  PATCH as patchWorkflow,
} from "@/app/api/workflows/[slug]/route";

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  runMigrations(db, ALL_MIGRATIONS);
  return db;
}

function params(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function patchReq(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/workflows/wf-a", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  dbHolder.current = makeDb();
});

describe("POST /api/workflows — create", () => {
  it("returns a slug", async () => {
    const res = await createWorkflow();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(typeof body.slug).toBe("string");
    expect(body.slug).toBe("test-slug-001");
  });

  it("persists the workflow to the database", async () => {
    await createWorkflow();
    const row = dbHolder.current!.prepare(
      `SELECT slug, name FROM workflows WHERE slug = ?`
    ).get("test-slug-001") as { slug: string; name: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.name).toBe("Untitled Workflow");
  });

  it("seeds a default workflow_api_keys row", async () => {
    await createWorkflow();
    const wf = dbHolder.current!.prepare(
      `SELECT id FROM workflows WHERE slug = ?`
    ).get("test-slug-001") as { id: number };
    const key = dbHolder.current!.prepare(
      `SELECT key_hash, key_prefix, scopes, is_active FROM workflow_api_keys WHERE workflow_id = ?`
    ).get(wf.id) as { key_hash: string; key_prefix: string; scopes: string; is_active: number } | undefined;
    expect(key).toBeDefined();
    expect(key!.is_active).toBe(1);
    expect(JSON.parse(key!.scopes)).toContain("execute");
    // Stored hashed, never as the raw sk-wf-* secret.
    expect(key!.key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(key!.key_prefix).toMatch(/^sk-wf-/);
  });
});

describe("GET /api/workflows — list", () => {
  it("returns only the seeded example when no user workflows exist", async () => {
    const res = await listWorkflows();
    const body = await res.json() as Array<{ slug: string }>;
    expect(res.status).toBe(200);
    // Migration 013 seeds the "API Guard (example)" workflow, so a fresh DB is
    // never truly empty — but it contains no user-created workflows yet.
    expect(body.map((w) => w.slug)).toEqual(["example-api-guard"]);
  });

  it("returns created workflows in the list", async () => {
    await createWorkflow();
    const res = await listWorkflows();
    const body = await res.json() as Array<{ id: number; slug: string; name: string }>;
    const created = body.find((w) => w.slug === "test-slug-001");
    expect(created).toBeDefined();
    expect(typeof created!.id).toBe("number");
  });

  it("exposes only {id, slug, name} — no sensitive fields (CONTRACT-WF-01)", async () => {
    await createWorkflow();
    const res = await listWorkflows();
    const body = await res.json() as Array<Record<string, unknown>>;
    const created = body.find((w) => w.slug === "test-slug-001")!;
    expect(Object.keys(created).sort()).toEqual(["id", "name", "slug"]);
    for (const field of ["api_key", "apiKey", "nodes", "edges", "webhook_token", "webhookToken"]) {
      expect(created).not.toHaveProperty(field);
    }
  });
});

describe("GET /api/workflows/[slug] — single workflow", () => {
  it("404 for unknown slug", async () => {
    const res = await getWorkflow(new Request("http://localhost"), params("nope"));
    expect(res.status).toBe(404);
  });

  it("200 with workflow data for existing slug", async () => {
    await createWorkflow();
    const res = await getWorkflow(new Request("http://localhost"), params("test-slug-001"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("test-slug-001");
    expect(body.name).toBe("Untitled Workflow");
    expect(Array.isArray(body.nodes)).toBe(true);
    expect(typeof body.isActive).toBe("boolean");
    expect(body).toHaveProperty("errorWorkflowId");
  });

  it("does not expose webhookToken or edges (CONTRACT-WF-03)", async () => {
    await createWorkflow();
    const res = await getWorkflow(new Request("http://localhost"), params("test-slug-001"));
    const body = await res.json();
    expect(body).not.toHaveProperty("webhookToken");
    expect(body).not.toHaveProperty("edges");
    expect(Object.keys(body).sort()).toEqual(
      ["errorWorkflowId", "id", "isActive", "name", "nodes", "slug"]
    );
  });
});

describe("DELETE /api/workflows/[slug] — delete", () => {
  it("404 for unknown slug", async () => {
    const res = await deleteWorkflow(new Request("http://localhost"), params("nope"));
    expect(res.status).toBe(404);
  });

  it("200 when deleting an inactive workflow", async () => {
    await createWorkflow();
    // Workflow starts inactive by default
    const res = await deleteWorkflow(new Request("http://localhost"), params("test-slug-001"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("409 when trying to delete the active workflow", async () => {
    await createWorkflow();
    dbHolder.current!.prepare(
      `UPDATE workflows SET is_active = 1 WHERE slug = ?`
    ).run("test-slug-001");
    const res = await deleteWorkflow(new Request("http://localhost"), params("test-slug-001"));
    expect(res.status).toBe(409);
  });

  it("workflow is removed from the database after deletion", async () => {
    await createWorkflow();
    await deleteWorkflow(new Request("http://localhost"), params("test-slug-001"));
    const row = dbHolder.current!.prepare(
      `SELECT id FROM workflows WHERE slug = ?`
    ).get("test-slug-001");
    expect(row).toBeUndefined();
  });
});

describe("PATCH /api/workflows/[slug] — update", () => {
  beforeEach(async () => {
    await createWorkflow();
  });

  it("200 when renaming a workflow", async () => {
    const res = await patchWorkflow(patchReq({ name: "New Name" }), params("test-slug-001"));
    expect(res.status).toBe(200);
    const row = dbHolder.current!.prepare(
      `SELECT name FROM workflows WHERE slug = ?`
    ).get("test-slug-001") as { name: string };
    expect(row.name).toBe("New Name");
  });

  it("activating a workflow sets is_active = 1", async () => {
    await patchWorkflow(patchReq({ is_active: true }), params("test-slug-001"));
    const row = dbHolder.current!.prepare(
      `SELECT is_active FROM workflows WHERE slug = ?`
    ).get("test-slug-001") as { is_active: number };
    expect(row.is_active).toBe(1);
  });

  it("activating one workflow deactivates all others", async () => {
    // Create a second workflow and manually activate it first
    dbHolder.current!.prepare(
      `INSERT INTO workflows (slug, name, api_key, is_active) VALUES (?,?,?,1)`
    ).run("wf-other", "Other", "sk-wf-other");

    // Now activate the first — the other should become inactive
    await patchWorkflow(patchReq({ is_active: true }), params("test-slug-001"));

    const other = dbHolder.current!.prepare(
      `SELECT is_active FROM workflows WHERE slug = ?`
    ).get("wf-other") as { is_active: number };
    expect(other.is_active).toBe(0);
  });

  it("assigns and clears an error workflow", async () => {
    // Create a second workflow to use as the error handler.
    const { lastInsertRowid } = dbHolder.current!.prepare(
      `INSERT INTO workflows (slug, name, api_key) VALUES (?,?,?)`
    ).run("wf-handler", "Handler", "sk-wf-handler") as { lastInsertRowid: number };
    const handlerId = Number(lastInsertRowid);

    await patchWorkflow(patchReq({ errorWorkflowId: handlerId }), params("test-slug-001"));
    let row = dbHolder.current!.prepare(
      `SELECT error_workflow_id FROM workflows WHERE slug = ?`
    ).get("test-slug-001") as { error_workflow_id: number | null };
    expect(row.error_workflow_id).toBe(handlerId);

    // The single-workflow GET exposes the assignment as errorWorkflowId.
    const getRes = await getWorkflow(new Request("http://localhost"), params("test-slug-001"));
    const getBody = await getRes.json();
    expect(getBody.errorWorkflowId).toBe(handlerId);

    // Clearing it persists null.
    await patchWorkflow(patchReq({ errorWorkflowId: null }), params("test-slug-001"));
    row = dbHolder.current!.prepare(
      `SELECT error_workflow_id FROM workflows WHERE slug = ?`
    ).get("test-slug-001") as { error_workflow_id: number | null };
    expect(row.error_workflow_id).toBeNull();
  });

  it("updates nodes and creates a version snapshot", async () => {
    const newNodes = [{ id: "n1", type: "text", data: {} }];
    await patchWorkflow(patchReq({ nodes: newNodes }), params("test-slug-001"));

    const wf = dbHolder.current!.prepare(
      `SELECT id FROM workflows WHERE slug = ?`
    ).get("test-slug-001") as { id: number };
    const versions = dbHolder.current!.prepare(
      `SELECT id FROM workflow_versions WHERE workflow_id = ?`
    ).all(wf.id) as Array<{ id: number }>;
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });
});
