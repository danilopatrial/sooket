import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSqliteAdapter } from "@/lib/db/workflow-adapter";

interface RouteParams { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDb();

  const workflow = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as { id: number } | undefined;
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const rows = db.prepare(
    `SELECT wc.node_id, wc.credential_id, c.name, c.type
     FROM workflow_credentials wc
     JOIN credentials c ON c.id = wc.credential_id
     WHERE wc.workflow_id = ?`
  ).all(workflow.id) as Array<{ node_id: string; credential_id: number; name: string; type: string }>;

  return NextResponse.json(
    rows.map((r) => ({ nodeId: r.node_id, credentialId: r.credential_id, name: r.name, type: r.type }))
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDb();

  const workflow = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as { id: number } | undefined;
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const body = await request.json() as { nodeId?: string; credentialId?: number };
  const { nodeId, credentialId } = body;
  if (!nodeId || credentialId == null) {
    return NextResponse.json({ error: "Missing nodeId or credentialId" }, { status: 400 });
  }

  const adapter = createSqliteAdapter();
  adapter.linkCredential(workflow.id, nodeId, credentialId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDb();

  const workflow = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as { id: number } | undefined;
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("nodeId");
  if (!nodeId) return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });

  const adapter = createSqliteAdapter();
  adapter.unlinkCredential(workflow.id, nodeId);
  return NextResponse.json({ ok: true });
}
