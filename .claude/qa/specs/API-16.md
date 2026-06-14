---
id: API-16
title: GET /api/metrics exposes Prometheus metrics, gated by the auth token
severity: medium
source_files:
  - app/api/metrics/route.ts
  - lib/metrics.ts
  - lib/security/auth.ts
---

## What this tests
Verifies that `GET /api/metrics` returns operational metrics in Prometheus 0.0.4 text-exposition format — execution counts by status, request/token counters, a latency summary, and live concurrency/queue gauges — derived from the existing tables plus the execution semaphore, and that the endpoint is **not** public: when `SOOKET_AUTH_TOKEN` is set the proxy gates it like the rest of the management surface.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow has run (so executions/request_logs have rows) — optional but makes the numbers non-zero

## Steps — exposition format
1. Scrape the endpoint:
   ```bash
   curl -si http://localhost:3000/api/metrics
   ```
2. Verify HTTP **200** and `Content-Type: text/plain; version=0.0.4; charset=utf-8` and `Cache-Control: no-store`.
3. Verify the body contains `# HELP`/`# TYPE` lines and these series:
   - `sooket_up 1`
   - `sooket_build_info{version="..."} 1`
   - `sooket_workflows{state="all"}` and `{state="active"}`
   - `sooket_executions_total{status="..."}` (one per observed status; `{status="none"} 0` when there are no executions)
   - `sooket_requests_total`
   - `sooket_request_tokens_total{direction="input"|"output"}`
   - `sooket_request_latency_ms_sum` and `sooket_request_latency_ms_count`
   - `sooket_execution_concurrency_active` / `_limit`, `sooket_execution_queue_depth` / `_limit`
4. (Optional) Point a Prometheus scraper / `promtool check metrics` at it and confirm it parses without error.

## Steps — gated by the shared secret
5. Restart with `SOOKET_AUTH_TOKEN=secret`. Request `/api/metrics` with **no** Authorization header → the proxy denies it (401 / redirect to `/unlock`), unlike `/api/health` which stays public.
6. Request again with `-H "Authorization: Bearer secret"` → 200 with the metrics body. (A Prometheus scrape config sets this bearer token.)

## Expected result
- 200 with the Prometheus content type, `Cache-Control: no-store`, and the series above; the body ends with a newline.
- Numbers reflect the DB: `sooket_workflows{state="all"}` = row count, `{state="active"}` = sum of `is_active`; `sooket_executions_total` grouped by `executions.status`; token/latency sums from `request_logs` (latency `_count` excludes NULL-latency rows); concurrency/queue gauges from the live `ExecutionSemaphore`.
- With `SOOKET_AUTH_TOKEN` set, the endpoint requires the bearer token; with it unset, it is reachable like the dashboard.

## Failure indicators
- `/api/metrics` is reachable without the token when `SOOKET_AUTH_TOKEN` is set (it must NOT be in `isPublicPath`).
- The body is JSON or otherwise not valid Prometheus exposition (a scraper/promtool rejects it).
- A metric is missing entirely when its underlying data is empty (e.g. no `sooket_executions_total` series at all — the placeholder `{status="none"} 0` must appear).
- Label values are not escaped (a `"`/`\` in `version` breaks parsing).

## Severity rationale
Observability is important for operating the gateway but the endpoint is read-only and gated; a defect degrades monitoring rather than correctness or security, hence medium. (Exposure of the metrics without the token would be a higher concern — covered by the gating check.)

## Source reference
`lib/metrics.ts` — `gatherMetrics(db, sem)` queries `workflows`/`executions`/`request_logs` and reads the semaphore; `renderPrometheus(snapshot)` formats the 0.0.4 exposition (with label escaping and a placeholder executions series); `PROMETHEUS_CONTENT_TYPE`. `app/api/metrics/route.ts` — `GET` returns `renderMetrics(getDb(), executionSemaphore)`. `lib/security/auth.ts` — `isPublicPath()` does **not** list `/api/metrics`, so the proxy gates it under `SOOKET_AUTH_TOKEN`.

## Notes
The metrics are point-in-time aggregates from the DB, so DB-derived `_total` series can drop if execution history is pruned (Prometheus treats a decrease as a counter reset). OpenTelemetry tracing and structured JSON stdout logs (the other parts of the original observability ask) remain future scope. Code-level coverage: `__tests__/lib/metrics.test.ts` (gather + render), `__tests__/api/metrics-route.test.ts` (route wiring), and the gating assertion in `__tests__/lib/security-auth.test.ts`.
