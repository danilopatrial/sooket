---
id: CONTRACT-LOG-01
title: GET logs returns {logs} array with node-level traces
severity: high
source_files:
  - app/api/workflows/[slug]/logs/route.ts
---

## What this tests
Verifies that `GET /api/workflows/[slug]/logs` returns a `{logs: [...]}` response where each entry contains request-level metrics and a nested `nodes` array with per-node execution traces.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- At least one execution has been run against the workflow (via `/api/v1/chat` or the debug endpoint) so that log rows exist

## Steps
1. Send a GET request to the logs endpoint:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/logs \
     | python3 -m json.tool
   ```
2. Confirm the top-level response has a `logs` key containing an array.
3. Inspect the first entry in `logs` and verify it has all request-level fields.
4. Inspect the `nodes` array inside that entry and verify each element has all node-level fields.

## Expected result
- HTTP status code is `200`.
- Response body has shape `{"logs": [...]}`.
- Each entry in `logs` contains exactly these fields:
  - `id` (number)
  - `model` (string or null)
  - `inputTokens` (number)
  - `outputTokens` (number)
  - `latencyMs` (number)
  - `createdAt` (string)
  - `nodes` (array)
- Each element of `nodes` contains exactly these fields:
  - `id` (number)
  - `nodeId` (string)
  - `nodeType` (string)
  - `inputSnapshot` (string or null)
  - `outputSnapshot` (string or null)
  - `durationMs` (number or null)
  - `error` (string or null)
  - `createdAt` (string)
- Entries are ordered most-recent first (descending by `id`).
- If no executions have been run, response is `{"logs": []}`.

## Failure indicators
- HTTP status code is not 200.
- Top-level key is not `logs` (e.g., `data` or `results`).
- Any request-level field (`inputTokens`, `outputTokens`, `latencyMs`, `createdAt`) is missing from a log entry.
- The `nodes` key is absent from any log entry.
- Any node-level field (`nodeId`, `nodeType`, `inputSnapshot`, `outputSnapshot`, `durationMs`) is missing.
- Entries are not ordered most-recent first.

## Severity rationale
The logs endpoint feeds the canvas Logs tab and the Executions config panel; a wrong response shape breaks both views.

## Source reference
`app/api/workflows/[slug]/logs/route.ts` lines 63–82 — the `logs` array is built by mapping `request_logs` rows and joining `node_execution_logs` rows grouped by `request_log_id`.

## Notes
The endpoint returns at most 20 entries regardless of total log count (see CONTRACT-LOG-02 for the cap). A workflow with no prior executions correctly returns `{"logs": []}` from the early-return on line 44.
