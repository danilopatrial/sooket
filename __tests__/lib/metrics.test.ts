/**
 * Observability metrics: gatherMetrics() reads the existing tables + the live
 * semaphore into a snapshot, and renderPrometheus() formats it as 0.0.4 text
 * exposition. Uses a minimal in-memory schema so assertions don't depend on
 * migrations or the seeded example workflow.
 */
import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  gatherMetrics,
  renderPrometheus,
  renderMetrics,
  type SemaphoreStats,
} from "@/lib/metrics";

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE workflows (id INTEGER PRIMARY KEY, is_active INTEGER DEFAULT 0);
    CREATE TABLE executions (id INTEGER PRIMARY KEY, status TEXT);
    CREATE TABLE request_logs (id INTEGER PRIMARY KEY, input_tokens INTEGER, output_tokens INTEGER, latency_ms INTEGER);
  `);
  return db;
}

const sem: SemaphoreStats = { activeCount: 2, max: 10, queueDepth: 3, maxQueue: 50 };

function seed(db: DatabaseSync): void {
  for (const active of [1, 0, 1]) db.prepare(`INSERT INTO workflows (is_active) VALUES (?)`).run(active);
  for (const status of ["success", "success", "error", "running"]) {
    db.prepare(`INSERT INTO executions (status) VALUES (?)`).run(status);
  }
  db.prepare(`INSERT INTO request_logs (input_tokens, output_tokens, latency_ms) VALUES (?,?,?)`).run(10, 20, 100);
  db.prepare(`INSERT INTO request_logs (input_tokens, output_tokens, latency_ms) VALUES (?,?,?)`).run(5, 5, 50);
  db.prepare(`INSERT INTO request_logs (input_tokens, output_tokens, latency_ms) VALUES (?,?,?)`).run(0, 0, null);
}

describe("gatherMetrics", () => {
  it("returns zeroed metrics for an empty DB", () => {
    const m = gatherMetrics(makeDb(), sem);
    expect(m.workflowsTotal).toBe(0);
    expect(m.workflowsActive).toBe(0);
    expect(m.executionsByStatus).toEqual({});
    expect(m.requestsTotal).toBe(0);
    expect(m.tokensInputTotal).toBe(0);
    expect(m.tokensOutputTotal).toBe(0);
    expect(m.latencySumMs).toBe(0);
    expect(m.latencyCount).toBe(0);
  });

  it("reflects the live semaphore stats", () => {
    const m = gatherMetrics(makeDb(), sem);
    expect(m.concurrencyActive).toBe(2);
    expect(m.concurrencyLimit).toBe(10);
    expect(m.queueDepth).toBe(3);
    expect(m.queueLimit).toBe(50);
  });

  it("aggregates seeded workflows, executions, and request logs", () => {
    const db = makeDb();
    seed(db);
    const m = gatherMetrics(db, sem);
    expect(m.workflowsTotal).toBe(3);
    expect(m.workflowsActive).toBe(2);
    expect(m.executionsByStatus).toEqual({ success: 2, error: 1, running: 1 });
    expect(m.requestsTotal).toBe(3);
    expect(m.tokensInputTotal).toBe(15);
    expect(m.tokensOutputTotal).toBe(25);
    expect(m.latencySumMs).toBe(150);
    // latencyCount excludes the NULL-latency row.
    expect(m.latencyCount).toBe(2);
  });
});

describe("renderPrometheus", () => {
  it("emits HELP/TYPE and the expected series for seeded data", () => {
    const db = makeDb();
    seed(db);
    const text = renderMetrics(db, sem);

    expect(text).toContain("# HELP sooket_up Whether the Sooket instance is serving.");
    expect(text).toContain("# TYPE sooket_up gauge");
    expect(text).toContain("\nsooket_up 1\n");
    expect(text).toMatch(/sooket_build_info\{version="[^"]+"\} 1/);
    expect(text).toContain('sooket_workflows{state="all"} 3');
    expect(text).toContain('sooket_workflows{state="active"} 2');
    expect(text).toContain('sooket_executions_total{status="success"} 2');
    expect(text).toContain('sooket_executions_total{status="error"} 1');
    expect(text).toContain("sooket_requests_total 3");
    expect(text).toContain('sooket_request_tokens_total{direction="input"} 15');
    expect(text).toContain('sooket_request_tokens_total{direction="output"} 25');
    expect(text).toContain("sooket_request_latency_ms_sum 150");
    expect(text).toContain("sooket_request_latency_ms_count 2");
    expect(text).toContain("sooket_execution_concurrency_active 2");
    expect(text).toContain("sooket_execution_concurrency_limit 10");
    expect(text).toContain("sooket_execution_queue_depth 3");
    expect(text).toContain("sooket_execution_queue_limit 50");
    // Exposition format ends with a newline.
    expect(text.endsWith("\n")).toBe(true);
  });

  it("emits a placeholder executions series when there are none", () => {
    const text = renderMetrics(makeDb(), sem);
    expect(text).toContain('sooket_executions_total{status="none"} 0');
  });

  it("escapes special characters in label values", () => {
    const snapshot = {
      version: 'a"b\\c',
      workflowsTotal: 0,
      workflowsActive: 0,
      executionsByStatus: {},
      requestsTotal: 0,
      tokensInputTotal: 0,
      tokensOutputTotal: 0,
      latencySumMs: 0,
      latencyCount: 0,
      concurrencyActive: 0,
      concurrencyLimit: 0,
      queueDepth: 0,
      queueLimit: 0,
    };
    expect(renderPrometheus(snapshot)).toContain('sooket_build_info{version="a\\"b\\\\c"} 1');
  });
});
