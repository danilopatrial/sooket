import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface RouteParams { params: Promise<{ slug: string; id: string }> }

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { slug, id } = await params;
  const presetId = parseInt(id, 10);
  if (!Number.isFinite(presetId) || presetId <= 0)
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  const workflow = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as unknown as { id: number } | undefined;
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = db.prepare(
    `DELETE FROM workflow_test_presets WHERE id = ? AND workflow_id = ?`
  ).run(presetId, workflow.id) as unknown as { changes: number };

  if (result.changes === 0) return NextResponse.json({ error: "Preset not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
