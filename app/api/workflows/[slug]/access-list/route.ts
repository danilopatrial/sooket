import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

function getWorkflowId(slug: string): number | null {
  const db = getDb();
  const row = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as
    | { id: number }
    | undefined;
  return row?.id ?? null;
}

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const db = getDb();
  const entries = db
    .prepare(`SELECT id, value, label, rule_type, created_at FROM workflow_access_lists WHERE workflow_id = ? ORDER BY created_at ASC`)
    .all(workflowId);

  return NextResponse.json({ entries });
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const VALID_RULE_TYPES = ["value", "ip", "cidr", "header"] as const;
  type RuleType = typeof VALID_RULE_TYPES[number];

  const body = await req.json() as { value?: string; label?: string; rule_type?: string };
  const value = (body.value ?? "").trim();
  if (!value) return NextResponse.json({ error: "value is required" }, { status: 400 });

  const label = (body.label ?? "").trim();
  const rule_type: RuleType = VALID_RULE_TYPES.includes(body.rule_type as RuleType)
    ? (body.rule_type as RuleType)
    : "value";

  const db = getDb();
  try {
    const result = db
      .prepare(`INSERT INTO workflow_access_lists (workflow_id, value, label, rule_type) VALUES (?, ?, ?, ?)`)
      .run(workflowId, value, label, rule_type) as { lastInsertRowid: number };
    const entry = db
      .prepare(`SELECT id, value, label, rule_type, created_at FROM workflow_access_lists WHERE id = ?`)
      .get(result.lastInsertRowid);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Entry already exists" }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

  const db = getDb();
  db.prepare(`DELETE FROM workflow_access_lists WHERE id = ? AND workflow_id = ?`).run(Number(id), workflowId);

  return NextResponse.json({ ok: true });
}
