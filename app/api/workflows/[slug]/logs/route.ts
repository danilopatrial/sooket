import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface RouteParams { params: Promise<{ slug: string }> }

interface NodeLogRow {
  id: number;
  node_id: string;
  node_type: string;
  input_snapshot: string | null;
  output_snapshot: string | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

interface RequestLogRow {
  id: number;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  created_at: string;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDb();

  const workflow = db.prepare(
    `SELECT id FROM workflows WHERE slug = ?`
  ).get(slug) as unknown as { id: number } | undefined;

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const logRows = db.prepare(
    `SELECT id, model, input_tokens, output_tokens, latency_ms, created_at
     FROM request_logs
     WHERE workflow_id = ?
     ORDER BY id DESC
     LIMIT 20`
  ).all(workflow.id) as unknown as RequestLogRow[];

  if (logRows.length === 0) return NextResponse.json({ logs: [] });

  const logIds = logRows.map((r) => r.id);
  const placeholders = logIds.map(() => "?").join(",");

  const nodeRows = db.prepare(
    `SELECT id, request_log_id, node_id, node_type, input_snapshot, output_snapshot, duration_ms, error, created_at
     FROM node_execution_logs
     WHERE request_log_id IN (${placeholders})
     ORDER BY id ASC`
  ).all(...logIds) as unknown as (NodeLogRow & { request_log_id: number })[];

  const nodesByRequestId = new Map<number, typeof nodeRows>();
  for (const n of nodeRows) {
    const arr = nodesByRequestId.get(n.request_log_id) ?? [];
    arr.push(n);
    nodesByRequestId.set(n.request_log_id, arr);
  }

  const logs = logRows.map((row) => ({
    id: row.id,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
    nodes: (nodesByRequestId.get(row.id) ?? []).map((n) => ({
      id: n.id,
      nodeId: n.node_id,
      nodeType: n.node_type,
      inputSnapshot: n.input_snapshot,
      outputSnapshot: n.output_snapshot,
      durationMs: n.duration_ms,
      error: n.error,
      createdAt: n.created_at,
    })),
  }));

  return NextResponse.json({ logs });
}
