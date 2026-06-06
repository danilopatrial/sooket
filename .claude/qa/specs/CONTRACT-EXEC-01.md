---
id: CONTRACT-EXEC-01
title: GET executions returns {executions, total}
severity: high
source_files:
  - app/api/workflows/[slug]/executions/route.ts
---

## What this tests
Verifies that `GET /api/workflows/[slug]/executions` returns a `{executions: [...], total: n}` response where each entry has the correct fields and `total` reflects the full count of all executions (not just the current page).

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- At least one execution has been run against the workflow

## Steps
1. Send a GET request to the executions endpoint:
   ```
   curl -s "http://localhost:3000/api/workflows/<slug>/executions" \
     | python3 -m json.tool
   ```
2. Confirm the top-level response has both `executions` (array) and `total` (number) keys.
3. Inspect the first entry in `executions` and verify all expected fields are present.
4. Confirm entries are ordered most-recent first (descending by `id`).

## Expected result
- HTTP status code is `200`.
- Response body has shape `{"executions": [...], "total": <n>}`.
- `total` is a number reflecting all executions for the workflow (not capped by the page limit).
- Each entry in `executions` contains exactly these fields:
  - `id` (number)
  - `status` (string, e.g. `"completed"`, `"failed"`, `"running"`)
  - `startedAt` (string)
  - `updatedAt` (string)
  - `completedAt` (string or null)
  - `latencyMs` (number or null)
  - `requestLogId` (number or null)
  - `nodeOutputs` (object — may be empty `{}` if no outputs or malformed data)
- Entries are ordered most-recent first (descending by `id`).
- If no executions exist, response is `{"executions": [], "total": 0}`.

## Failure indicators
- HTTP status code is not 200.
- `total` key is absent or equals the array length when more executions exist than the page size.
- `executions` key is absent or not an array.
- Any entry is missing one of the documented fields (`status`, `startedAt`, `completedAt`, `latencyMs`, `nodeOutputs`).
- Entries are not ordered most-recent first.

## Severity rationale
The executions endpoint backs the Executions config tab; a wrong response shape breaks the pagination UI and node output detail view.

## Source reference
`app/api/workflows/[slug]/executions/route.ts` line 64 — `return NextResponse.json({ executions, total })`.  
Lines 41–43 — `total` is a separate `SELECT COUNT(*)` query, independent of the paginated rows.  
Lines 52–61 — shape of each execution entry.

## Notes
Default page size is 50 (when no `?limit=` param is supplied). The `nodeOutputs` field is parsed from the `execution_data` JSON column; if the column is malformed, `nodeOutputs` is returned as `{}` rather than causing an error.
