import type { DatabaseSync } from "node:sqlite";
import { version } from "@/package.json";

/**
 * Observability metrics in Prometheus text-exposition format, derived from the
 * existing tables (no schema change) plus the live execution semaphore. Kept
 * free of `server-only`/Next imports and parameterised on its inputs so it can
 * be unit-tested against an in-memory DB and a plain stats object.
 */

/** Live concurrency stats — satisfied by the `ExecutionSemaphore` singleton. */
export interface SemaphoreStats {
  readonly activeCount: number;
  readonly max: number;
  readonly queueDepth: number;
  readonly maxQueue: number;
}

export interface MetricsSnapshot {
  version: string;
  workflowsTotal: number;
  workflowsActive: number;
  executionsByStatus: Record<string, number>;
  requestsTotal: number;
  tokensInputTotal: number;
  tokensOutputTotal: number;
  latencySumMs: number;
  latencyCount: number;
  concurrencyActive: number;
  concurrencyLimit: number;
  queueDepth: number;
  queueLimit: number;
}

/** Query the DB + read the semaphore into a typed snapshot. */
export function gatherMetrics(db: DatabaseSync, sem: SemaphoreStats): MetricsSnapshot {
  const wf = db
    .prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(is_active), 0) AS active FROM workflows`)
    .get() as { total: number; active: number };

  const execRows = db
    .prepare(`SELECT status, COUNT(*) AS n FROM executions GROUP BY status`)
    .all() as Array<{ status: string; n: number }>;
  const executionsByStatus: Record<string, number> = {};
  for (const row of execRows) executionsByStatus[row.status] = row.n;

  const req = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(input_tokens), 0)  AS inTok,
              COALESCE(SUM(output_tokens), 0) AS outTok,
              COALESCE(SUM(latency_ms), 0)    AS latSum,
              COUNT(latency_ms)               AS latCount
         FROM request_logs`,
    )
    .get() as { total: number; inTok: number; outTok: number; latSum: number; latCount: number };

  return {
    version,
    workflowsTotal: wf.total,
    workflowsActive: wf.active,
    executionsByStatus,
    requestsTotal: req.total,
    tokensInputTotal: req.inTok,
    tokensOutputTotal: req.outTok,
    latencySumMs: req.latSum,
    latencyCount: req.latCount,
    concurrencyActive: sem.activeCount,
    concurrencyLimit: sem.max,
    queueDepth: sem.queueDepth,
    queueLimit: sem.maxQueue,
  };
}

/** Escape a Prometheus label value (backslash, double-quote, newline). */
function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/** Render a snapshot as Prometheus 0.0.4 text exposition. */
export function renderPrometheus(s: MetricsSnapshot): string {
  const lines: string[] = [];
  const metric = (name: string, help: string, type: string) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
  };

  metric("sooket_up", "Whether the Sooket instance is serving.", "gauge");
  lines.push("sooket_up 1");

  metric("sooket_build_info", "Build version info (value is always 1).", "gauge");
  lines.push(`sooket_build_info{version="${escapeLabel(s.version)}"} 1`);

  metric("sooket_workflows", "Configured workflows by state.", "gauge");
  lines.push(`sooket_workflows{state="all"} ${s.workflowsTotal}`);
  lines.push(`sooket_workflows{state="active"} ${s.workflowsActive}`);

  metric("sooket_executions_total", "Workflow executions by status.", "counter");
  // Always emit at least one series so the metric is present even with no data.
  const statuses = Object.keys(s.executionsByStatus);
  if (statuses.length === 0) {
    lines.push(`sooket_executions_total{status="none"} 0`);
  } else {
    for (const status of statuses.sort()) {
      lines.push(`sooket_executions_total{status="${escapeLabel(status)}"} ${s.executionsByStatus[status]}`);
    }
  }

  metric("sooket_requests_total", "Total recorded request logs.", "counter");
  lines.push(`sooket_requests_total ${s.requestsTotal}`);

  metric("sooket_request_tokens_total", "Total LLM tokens recorded, by direction.", "counter");
  lines.push(`sooket_request_tokens_total{direction="input"} ${s.tokensInputTotal}`);
  lines.push(`sooket_request_tokens_total{direction="output"} ${s.tokensOutputTotal}`);

  metric("sooket_request_latency_ms", "Recorded request latency in milliseconds.", "summary");
  lines.push(`sooket_request_latency_ms_sum ${s.latencySumMs}`);
  lines.push(`sooket_request_latency_ms_count ${s.latencyCount}`);

  metric("sooket_execution_concurrency_active", "Executions currently holding a slot.", "gauge");
  lines.push(`sooket_execution_concurrency_active ${s.concurrencyActive}`);
  metric("sooket_execution_concurrency_limit", "Maximum concurrent executions.", "gauge");
  lines.push(`sooket_execution_concurrency_limit ${s.concurrencyLimit}`);
  metric("sooket_execution_queue_depth", "Executions waiting for a slot.", "gauge");
  lines.push(`sooket_execution_queue_depth ${s.queueDepth}`);
  metric("sooket_execution_queue_limit", "Maximum queued executions.", "gauge");
  lines.push(`sooket_execution_queue_limit ${s.queueLimit}`);

  // Exposition format requires a trailing newline.
  return lines.join("\n") + "\n";
}

/** Convenience: gather + render in one call (used by the route). */
export function renderMetrics(db: DatabaseSync, sem: SemaphoreStats): string {
  return renderPrometheus(gatherMetrics(db, sem));
}

/** Standard Prometheus 0.0.4 text content type. */
export const PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";
