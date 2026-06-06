import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface RouteParams { params: Promise<{ slug: string }> }

interface PresetRow {
  id: number;
  name: string;
  body: string;
  headers: string | null;
  query: string | null;
  created_at: string;
}

function parseKV(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

function getWorkflowId(slug: string): number | null {
  const db = getDb();
  const row = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as unknown as { id: number } | undefined;
  return row?.id ?? null;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (!workflowId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = getDb();
  const rows = db.prepare(
    `SELECT id, name, body, headers, query, created_at FROM workflow_test_presets
     WHERE workflow_id = ? ORDER BY created_at DESC`
  ).all(workflowId) as unknown as PresetRow[];

  return NextResponse.json({
    presets: rows.map((r) => ({
      id: r.id,
      name: r.name,
      body: r.body,
      headers: parseKV(r.headers),
      query: parseKV(r.query),
      createdAt: r.created_at,
    })),
  });
}

export async function POST(req: Request, { params }: RouteParams) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (!workflowId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let name: string;
  let body: string;
  let headersJson: string | null = null;
  let queryJson: string | null = null;
  try {
    const payload = await req.json() as { name?: unknown; body?: unknown; headers?: unknown; query?: unknown };
    if (typeof payload.name !== "string" || !payload.name.trim())
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (typeof payload.body !== "string")
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    // Validate that body is valid JSON
    JSON.parse(payload.body);
    name = payload.name.trim().slice(0, 100);
    body = payload.body;

    if (payload.headers !== undefined && payload.headers !== null) {
      if (typeof payload.headers !== "object" || Array.isArray(payload.headers))
        return NextResponse.json({ error: "headers must be an object" }, { status: 400 });
      headersJson = JSON.stringify(payload.headers);
    }
    if (payload.query !== undefined && payload.query !== null) {
      if (typeof payload.query !== "object" || Array.isArray(payload.query))
        return NextResponse.json({ error: "query must be an object" }, { status: 400 });
      queryJson = JSON.stringify(payload.query);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getDb();
  try {
    db.prepare(
      `INSERT INTO workflow_test_presets (workflow_id, name, body, headers, query) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(workflow_id, name) DO UPDATE SET body = excluded.body, headers = excluded.headers, query = excluded.query`
    ).run(workflowId, name, body, headersJson, queryJson);

    const preset = db.prepare(
      `SELECT id, name, body, headers, query, created_at FROM workflow_test_presets WHERE workflow_id = ? AND name = ?`
    ).get(workflowId, name) as unknown as PresetRow;

    return NextResponse.json({
      preset: {
        id: preset.id,
        name: preset.name,
        body: preset.body,
        headers: parseKV(preset.headers),
        query: parseKV(preset.query),
        createdAt: preset.created_at,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save preset" }, { status: 500 });
  }
}
