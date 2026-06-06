import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface RouteParams { params: Promise<{ slug: string }> }

interface VersionRow {
  id: number;
  nodes: string;
  edges: string;
  created_at: string;
}

export async function GET(
  _req: Request,
  { params }: RouteParams
) {
  const { slug } = await params;
  const db = getDb();

  const wf = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as unknown as { id: number } | undefined;
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = db.prepare(
    `SELECT id, nodes, edges, created_at FROM workflow_versions WHERE workflow_id = ? ORDER BY id DESC LIMIT 50`
  ).all(wf.id) as unknown as VersionRow[];

  const versions = rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    nodes: JSON.parse(r.nodes) as Record<string, unknown>[],
    edges: JSON.parse(r.edges) as Record<string, unknown>[],
  }));

  return NextResponse.json({ versions });
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const { slug } = await params;
  const db = getDb();

  const wf = db.prepare(`SELECT id, nodes, edges FROM workflows WHERE slug = ?`).get(slug) as unknown as { id: number; nodes: string; edges: string } | undefined;
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { versionId?: number };
  try {
    body = await request.json() as { versionId?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.versionId !== "number") {
    return NextResponse.json({ error: "versionId must be a number" }, { status: 400 });
  }

  const version = db.prepare(
    `SELECT id, nodes, edges FROM workflow_versions WHERE id = ? AND workflow_id = ?`
  ).get(body.versionId, wf.id) as unknown as VersionRow | undefined;

  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Snapshot the current (pre-restore) state so the restore is reversible
  db.prepare(
    `INSERT INTO workflow_versions (workflow_id, nodes, edges) VALUES (?, ?, ?)`
  ).run(wf.id, wf.nodes, wf.edges);
  db.prepare(
    `DELETE FROM workflow_versions WHERE workflow_id = ? AND id NOT IN (SELECT id FROM workflow_versions WHERE workflow_id = ? ORDER BY id DESC LIMIT 50)`
  ).run(wf.id, wf.id);

  // Apply the restored nodes/edges to the workflow
  db.prepare(
    `UPDATE workflows SET nodes = ?, edges = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(version.nodes, version.edges, wf.id);

  return NextResponse.json({ ok: true });
}
