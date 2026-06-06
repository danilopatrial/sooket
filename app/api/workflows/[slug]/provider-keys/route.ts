import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const SECRET = process.env.ENCRYPTION_SECRET!;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();

  const { provider, key } = await request.json();
  if (!provider || !key) {
    return NextResponse.json({ error: "Missing provider or key" }, { status: 400 });
  }

  const workflow = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as unknown as { id: number } | undefined;
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const encryptedKey = await encrypt(key.trim(), SECRET);

  db.prepare(`
    INSERT INTO workflow_provider_keys (workflow_id, provider, encrypted_key)
    VALUES (?, ?, ?)
    ON CONFLICT(workflow_id, provider) DO UPDATE SET encrypted_key = excluded.encrypted_key
  `).run(workflow.id, provider, encryptedKey);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "Missing provider" }, { status: 400 });

  const workflow = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as unknown as { id: number } | undefined;
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  db.prepare(`DELETE FROM workflow_provider_keys WHERE workflow_id = ? AND provider = ?`).run(workflow.id, provider);

  return NextResponse.json({ ok: true });
}
