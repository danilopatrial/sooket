---
id: ENGINE-09
title: Execution deadline aborts a runaway workflow with 504
severity: high
source_files:
  - lib/workflow-engine.ts
  - lib/execution-handler.ts
  - app/api/webhooks/[slug]/route.ts
  - lib/workflow-types.ts
---

## What this tests
Verifies that a workflow whose total run time exceeds the wall-clock budget (`EXECUTION_TIMEOUT_MS`, default 30000 ms) is aborted at the next node boundary with a `WorkflowTimeoutError`, that the live API maps it to HTTP `504` with an error message containing "timed out", and that the deadline is terminal — it is not absorbed by an error edge and does not let the graph resume.

## Prerequisites
- App is running at http://localhost:3000
- A valid workflow API key (`sk-wf-...`) for an active workflow
- A workflow that can be made to run longer than the configured budget — e.g. a chain of two or more nodes where an upstream node sleeps (a Custom Code node with `await new Promise(r => setTimeout(r, 8000))` followed by another node), or several sequential HTTP Request nodes against a slow endpoint
- Ability to set `EXECUTION_TIMEOUT_MS` for the server process

## Steps
1. Start the server with a small budget so the limit is easy to hit:
   ```
   EXECUTION_TIMEOUT_MS=2000 npm run dev
   ```
2. Build/select a workflow whose execution crosses two node boundaries and takes longer than 2 s in total (e.g. Custom Code sleeps ~3 s, then feeds a second node).
3. Call the live API and time the response:
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" -X POST \
     http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-..." \
     -H "Content-Type: application/json" \
     -d '{"message":"slow"}'
   ```
4. Inspect the JSON error body:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-..." \
     -H "Content-Type: application/json" -d '{"message":"slow"}'
   ```
5. Repeat against the webhook endpoint (`/api/webhooks/<slug>`) for a token-gated workflow and confirm the same 504 mapping.
6. Restart with `EXECUTION_TIMEOUT_MS=0` (disabled) and confirm the same slow workflow now runs to completion (200) rather than timing out.

## Expected result
- Step 3: HTTP **504**, with `time_total` close to the configured budget plus at most one in-flight node's own timeout (cooperative cancellation — the deadline is checked at node boundaries).
- Step 4: body is `{ "error": "Workflow execution timed out after 2000 ms" }` (message contains "timed out").
- Step 5: webhook returns `504` with `{ ok: false, error: "Workflow execution timed out..." }`.
- Step 6: with the budget disabled, the workflow completes and returns `200`.
- A blown deadline frees the execution semaphore slot once the in-flight node settles (a follow-up request is not permanently rejected).

## Failure indicators
- A runaway workflow returns `500` instead of `504`, or never returns (connection hangs indefinitely).
- The timeout is caught by an error edge and the workflow continues past its budget (the run "completes" with a 200 despite exceeding the limit).
- `EXECUTION_TIMEOUT_MS=0` still aborts the workflow (disable is ignored).
- The semaphore slot is not released after a timeout (subsequent requests always 503).

## Severity rationale
Without a global deadline a single slow workflow pins a scarce concurrency slot indefinitely, so a handful of them starve every other caller (head-of-line blocking); high because it directly affects instance availability.

## Source reference
`lib/workflow-engine.ts` — `executionTimeoutMs()` resolves the budget; `executeWorkflow` arms `reqCtx.deadlineAt` for the top-level run (`subDepth === 0`); `evaluateNode` throws `WorkflowTimeoutError` when `Date.now() > reqCtx.deadlineAt`; the node `catch` re-throws `WorkflowTimeoutError` before any error-edge routing. `lib/execution-handler.ts` maps `error.includes(WORKFLOW_TIMEOUT_ERROR)` to status `504`; `app/api/webhooks/[slug]/route.ts` applies the same mapping.

## Notes
Enforcement is cooperative: the deadline is checked at each node boundary, so a single node already in flight (e.g. an HTTP Request with a 10 s timeout) can overrun the budget by up to that node's own limit before the next boundary check fires. Sub-workflows inherit the parent's `deadlineAt` through the shared `reqCtx`, so a nested call chain cannot reset or outlast the original budget. The error workflow (if configured) runs with its own fresh context. A deterministic way to exercise the boundary in code is to pass a `reqCtx` with `deadlineAt` already in the past — see `__tests__/lib/workflow-engine-deadline.test.ts`.
