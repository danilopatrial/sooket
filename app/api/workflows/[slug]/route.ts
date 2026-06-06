import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  const workflow = db.prepare(
    `SELECT id, name, slug, nodes, is_active, error_workflow_id FROM workflows WHERE slug = ?`
  ).get(slug) as unknown as { id: number; name: string; slug: string; nodes: string; is_active: number; error_workflow_id: number | null } | undefined;
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: workflow.id,
    name: workflow.name,
    slug: workflow.slug,
    nodes: JSON.parse(workflow.nodes),
    isActive: workflow.is_active === 1,
    // errorWorkflowId is part of the contract: the General config tab's error-
    // workflow picker reads it from this endpoint (see CFG-GEN-04).
    errorWorkflowId: workflow.error_workflow_id ?? null,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();

  const workflow = db.prepare(
    `SELECT id, is_active FROM workflows WHERE slug = ?`
  ).get(slug) as unknown as { id: number; is_active: number } | undefined;

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workflow.is_active) return NextResponse.json({ error: "Cannot delete an active workflow" }, { status: 409 });

  db.prepare(`DELETE FROM request_logs WHERE workflow_id = ?`).run(workflow.id);
  db.prepare(`DELETE FROM workflows WHERE id = ?`).run(workflow.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  const body = await request.json();

  const sets: string[] = [`updated_at = datetime('now')`];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];

  // Snapshot a new version whenever nodes or edges are being saved.
  if (body.nodes !== undefined || body.edges !== undefined) {
    const wfRow = db.prepare(
      `SELECT id, nodes, edges FROM workflows WHERE slug = ?`
    ).get(slug) as unknown as { id: number; nodes: string; edges: string } | undefined;

    if (wfRow) {
      const snapNodes = body.nodes !== undefined ? JSON.stringify(body.nodes) : wfRow.nodes;
      const snapEdges = body.edges !== undefined ? JSON.stringify(body.edges) : wfRow.edges;
      db.prepare(
        `INSERT INTO workflow_versions (workflow_id, nodes, edges) VALUES (?, ?, ?)`
      ).run(wfRow.id, snapNodes, snapEdges);
      // Cap at 50 versions per workflow
      db.prepare(
        `DELETE FROM workflow_versions WHERE workflow_id = ? AND id NOT IN (SELECT id FROM workflow_versions WHERE workflow_id = ? ORDER BY id DESC LIMIT 50)`
      ).run(wfRow.id, wfRow.id);
    }
  }

  if (body.name     !== undefined) { sets.push("name = ?");      values.push(body.name); }
  if (body.nodes    !== undefined) { sets.push("nodes = ?");     values.push(JSON.stringify(body.nodes)); }
  if (body.edges    !== undefined) { sets.push("edges = ?");     values.push(JSON.stringify(body.edges)); }
  if ("errorWorkflowId" in body)  { sets.push("error_workflow_id = ?"); values.push(body.errorWorkflowId ?? null); }
  if ("pinData" in body)          { sets.push("pin_data = ?");  values.push(body.pinData != null ? JSON.stringify(body.pinData) : null); }
  if (body.is_active !== undefined) {
    sets.push("is_active = ?");
    values.push(body.is_active ? 1 : 0);
    // Deactivate all other workflows when activating one
    if (body.is_active) {
      db.prepare(`UPDATE workflows SET is_active = 0 WHERE slug != ?`).run(slug);
    }
  }

  values.push(slug);
  db.prepare(`UPDATE workflows SET ${sets.join(", ")} WHERE slug = ?`).run(...values);

  return NextResponse.json({ ok: true });
}
