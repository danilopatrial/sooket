---
id: CONTRACT-LOG-02
title: GET logs returns at most 20 entries
severity: low
source_files:
  - app/api/workflows/[slug]/logs/route.ts
---

## What this tests
Verifies that `GET /api/workflows/[slug]/logs` returns no more than 20 log entries even when the workflow has more than 20 recorded executions.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- More than 20 executions have been run against the workflow (trigger via the debug endpoint in a loop if needed)

## Steps
1. If fewer than 21 execution logs exist, generate them by running the debug endpoint 21 times:
   ```
   for i in $(seq 1 21); do
     curl -s -X POST http://localhost:3000/api/workflows/<slug>/debug \
       -H "Content-Type: application/json" \
       -d "{\"message\": \"run $i\"}" > /dev/null
   done
   ```
2. Fetch the logs:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/logs \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['logs']))"
   ```
3. Note the count printed.

## Expected result
- HTTP status code is `200`.
- The count of entries in `logs` is exactly `20`, not 21 or more.
- The entries are the 20 most-recent executions (ordered by `id DESC`).

## Failure indicators
- The count exceeds 20 — the `LIMIT 20` clause is not being applied.
- The count is less than 20 when 21 or more executions exist — entries are being lost before the limit is reached.
- Response is not valid JSON or the `logs` key is absent.

## Severity rationale
The 20-entry cap is a performance contract; exceeding it on large histories could degrade the Logs panel load time, but the cap itself is not a safety-critical boundary.

## Source reference
`app/api/workflows/[slug]/logs/route.ts` line 41 — `LIMIT 20` in the `request_logs` SELECT query.

## Notes
The cap applies to request-level log rows. The associated `node_execution_logs` rows for those 20 requests are all returned (no secondary cap on node rows).
