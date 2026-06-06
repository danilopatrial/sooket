import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface RouteParams { params: Promise<{ slug: string }> }

interface ExecutionRow {
  id: number;
  status: string;
  execution_data: string;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  request_log_id: number | null;
  latency_ms: number | null;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const db = getDb();

  const workflow = db.prepare(
    `SELECT id FROM workflows WHERE slug = ?`
  ).get(slug) as { id: number } | undefined;

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = db.prepare(
    `SELECT e.id, e.status, e.execution_data, e.started_at, e.updated_at, e.completed_at,
            e.request_log_id, rl.latency_ms
     FROM executions e
     LEFT JOIN request_logs rl ON rl.id = e.request_log_id
     WHERE e.workflow_id = ?
     ORDER BY e.id DESC
     LIMIT ? OFFSET ?`
  ).all(workflow.id, limit, offset) as unknown as ExecutionRow[];

  const total = (db.prepare(
    `SELECT COUNT(*) as n FROM executions WHERE workflow_id = ?`
  ).get(workflow.id) as { n: number }).n;

  const executions = rows.map((r) => {
    let nodeOutputs: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(r.execution_data) as { nodeOutputs?: Record<string, unknown> };
      nodeOutputs = parsed.nodeOutputs ?? {};
    } catch { /* malformed — return empty */ }

    return {
      id: r.id,
      status: r.status,
      startedAt: r.started_at,
      updatedAt: r.updated_at,
      completedAt: r.completed_at,
      latencyMs: r.latency_ms,
      requestLogId: r.request_log_id,
      nodeOutputs,
    };
  });

  return NextResponse.json({ executions, total });
}
