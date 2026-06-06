import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug, id } = await params;
  const keyId = Number(id);
  if (!Number.isInteger(keyId) || keyId < 1) {
    return NextResponse.json({ error: "Invalid key id" }, { status: 400 });
  }

  const db = getDb();

  // Verify the key belongs to this workflow
  const keyRow = db.prepare(
    `SELECT k.id FROM workflow_api_keys k
     JOIN workflows w ON w.id = k.workflow_id
     WHERE k.id = ? AND w.slug = ?`
  ).get(keyId, slug) as { id: number } | undefined;
  if (!keyRow) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  // Aggregate stats over last 30 days
  const summary = db.prepare(
    `SELECT
       COUNT(*)                                   AS total_requests,
       COALESCE(SUM(input_tokens), 0)             AS total_input_tokens,
       COALESCE(SUM(output_tokens), 0)            AS total_output_tokens,
       COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens,
       COALESCE(ROUND(AVG(latency_ms)), 0)        AS avg_latency_ms,
       COALESCE(MIN(latency_ms), 0)               AS min_latency_ms,
       COALESCE(MAX(latency_ms), 0)               AS max_latency_ms
     FROM request_logs
     WHERE api_key_id = ?
       AND created_at >= datetime('now', '-30 days')`
  ).get(keyId) as {
    total_requests: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
    avg_latency_ms: number;
    min_latency_ms: number;
    max_latency_ms: number;
  };

  // All-time total
  const allTime = db.prepare(
    `SELECT COUNT(*) AS total FROM request_logs WHERE api_key_id = ?`
  ).get(keyId) as { total: number };

  // Daily request counts for last 30 days
  const dailyRows = db.prepare(
    `SELECT date(created_at) AS day, COUNT(*) AS requests
     FROM request_logs
     WHERE api_key_id = ?
       AND created_at >= datetime('now', '-30 days')
     GROUP BY day
     ORDER BY day ASC`
  ).all(keyId) as Array<{ day: string; requests: number }>;

  // Fill in zero-count days so the chart always has 30 entries
  const dailyMap = new Map(dailyRows.map((r) => [r.day, r.requests]));
  const daily: Array<{ day: string; requests: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    daily.push({ day, requests: dailyMap.get(day) ?? 0 });
  }

  return NextResponse.json({
    period_days: 30,
    total_requests: summary.total_requests,
    total_requests_all_time: allTime.total,
    total_tokens: summary.total_tokens,
    total_input_tokens: summary.total_input_tokens,
    total_output_tokens: summary.total_output_tokens,
    avg_latency_ms: summary.avg_latency_ms,
    min_latency_ms: summary.min_latency_ms,
    max_latency_ms: summary.max_latency_ms,
    daily,
  });
}
