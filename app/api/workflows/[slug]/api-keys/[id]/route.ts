import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ slug: string; id: string }> };

function getWorkflowId(slug: string): number | null {
  const db = getDb();
  const row = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as { id: number } | undefined;
  return row?.id ?? null;
}

export async function PATCH(req: Request, { params }: Params) {
  const { slug, id } = await params;
  const keyId = Number(id);
  if (!Number.isInteger(keyId) || keyId < 1) {
    return NextResponse.json({ error: "Invalid key id" }, { status: 400 });
  }

  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const db = getDb();
  const existing = db.prepare(
    `SELECT id, is_active FROM workflow_api_keys WHERE id = ? AND workflow_id = ?`
  ).get(keyId, workflowId) as { id: number; is_active: number } | undefined;
  if (!existing) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  const body = await req.json() as { label?: string; is_active?: boolean };

  let newLabel: string | undefined;
  let newIsActive: number | undefined;

  if (body.label !== undefined) {
    const label = String(body.label).trim().slice(0, 100);
    if (!label) return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
    newLabel = label;
  }

  if (body.is_active !== undefined) {
    const nextActive = !!body.is_active;

    if (!nextActive) {
      const activeCount = (db.prepare(
        `SELECT COUNT(*) as cnt FROM workflow_api_keys WHERE workflow_id = ? AND is_active = 1`
      ).get(workflowId) as { cnt: number }).cnt;
      if (activeCount <= 1 && existing.is_active) {
        return NextResponse.json({ error: "Cannot disable the last active key for this workflow" }, { status: 409 });
      }
    }

    newIsActive = nextActive ? 1 : 0;
  }

  if (newLabel === undefined && newIsActive === undefined) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Build update with only changed fields to avoid spread typing issues
  if (newLabel !== undefined && newIsActive !== undefined) {
    db.prepare(`UPDATE workflow_api_keys SET label = ?, is_active = ? WHERE id = ? AND workflow_id = ?`)
      .run(newLabel, newIsActive, keyId, workflowId);
  } else if (newLabel !== undefined) {
    db.prepare(`UPDATE workflow_api_keys SET label = ? WHERE id = ? AND workflow_id = ?`)
      .run(newLabel, keyId, workflowId);
  } else {
    db.prepare(`UPDATE workflow_api_keys SET is_active = ? WHERE id = ? AND workflow_id = ?`)
      .run(newIsActive!, keyId, workflowId);
  }

  const updated = db.prepare(
    `SELECT id, label, scopes, rate_limit_override, expires_at, last_used_at, is_active, created_at
     FROM workflow_api_keys WHERE id = ?`
  ).get(keyId) as {
    id: number; label: string; scopes: string;
    rate_limit_override: number | null; expires_at: string | null;
    last_used_at: string | null; is_active: number; created_at: string;
  };

  return NextResponse.json({
    key: {
      id: updated.id,
      label: updated.label,
      scopes: JSON.parse(updated.scopes),
      rate_limit_override: updated.rate_limit_override,
      expires_at: updated.expires_at,
      last_used_at: updated.last_used_at,
      is_active: !!updated.is_active,
      created_at: updated.created_at,
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { slug, id } = await params;
  const keyId = Number(id);
  if (!Number.isInteger(keyId) || keyId < 1) {
    return NextResponse.json({ error: "Invalid key id" }, { status: 400 });
  }

  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const db = getDb();
  const existing = db.prepare(
    `SELECT id, is_active FROM workflow_api_keys WHERE id = ? AND workflow_id = ?`
  ).get(keyId, workflowId) as { id: number; is_active: number } | undefined;
  if (!existing) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  // Prevent deleting the last active key
  if (existing.is_active) {
    const activeCount = (db.prepare(
      `SELECT COUNT(*) as cnt FROM workflow_api_keys WHERE workflow_id = ? AND is_active = 1`
    ).get(workflowId) as { cnt: number }).cnt;
    if (activeCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the last active key for this workflow" }, { status: 409 });
    }
  }

  db.prepare(`DELETE FROM workflow_api_keys WHERE id = ? AND workflow_id = ?`).run(keyId, workflowId);
  return NextResponse.json({ ok: true });
}
