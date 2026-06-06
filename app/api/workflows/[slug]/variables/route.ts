import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const SECRET = process.env.ENCRYPTION_SECRET!;
const NAME_RE = /^[A-Z][A-Z0-9_]*$/;

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
  const rows = db
    .prepare(`SELECT name, created_at FROM customer_variables WHERE workflow_id = ? ORDER BY name`)
    .all(workflowId) as Array<{ name: string; created_at: string }>;

  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const { name, value } = await req.json();

  if (!name || typeof name !== "string" || !NAME_RE.test(name)) {
    return NextResponse.json(
      { error: "Name must be UPPER_SNAKE_CASE (e.g. MY_KEY)" },
      { status: 400 }
    );
  }
  if (!value || typeof value !== "string") {
    return NextResponse.json({ error: "Missing value" }, { status: 400 });
  }

  const encrypted_value = await encrypt(value.trim(), SECRET);
  const db = getDb();

  db.prepare(`
    INSERT INTO customer_variables (workflow_id, name, encrypted_value)
    VALUES (?, ?, ?)
    ON CONFLICT(workflow_id, name) DO UPDATE SET encrypted_value = excluded.encrypted_value
  `).run(workflowId, name, encrypted_value);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const db = getDb();
  db.prepare(`DELETE FROM customer_variables WHERE workflow_id = ? AND name = ?`).run(workflowId, name);

  return NextResponse.json({ ok: true });
}
