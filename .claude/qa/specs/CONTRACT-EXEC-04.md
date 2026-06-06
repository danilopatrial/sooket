---
id: CONTRACT-EXEC-04
title: total field reflects full execution count, not page size
severity: medium
source_files:
  - app/api/workflows/[slug]/executions/route.ts
---

## What this tests
Verifies that the `total` field in the executions response always reflects the complete count of all executions for the workflow, independent of the `limit` and `offset` pagination parameters.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- More than 5 executions exist for the workflow (run the debug endpoint 6+ times if needed)

## Steps
1. If fewer than 6 executions exist, generate them:
   ```
   for i in $(seq 1 6); do
     curl -s -X POST http://localhost:3000/api/workflows/<slug>/debug \
       -H "Content-Type: application/json" \
       -d "{\"message\": \"run $i\"}" > /dev/null
   done
   ```
2. Fetch with a small page size of 2:
   ```
   curl -s "http://localhost:3000/api/workflows/<slug>/executions?limit=2&offset=0" \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print('page_count:', len(d['executions']), 'total:', d['total'])"
   ```
3. Fetch with no limit (default 50):
   ```
   curl -s "http://localhost:3000/api/workflows/<slug>/executions" \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print('page_count:', len(d['executions']), 'total:', d['total'])"
   ```
4. Compare the `total` values from both requests.

## Expected result
- Both requests return HTTP `200`.
- The `total` value is identical in both responses and equals the actual number of executions for the workflow (≥ 6).
- The first request's `executions` array has exactly 2 entries (the page), while `total` is ≥ 6.
- `total` is never equal to the `limit` value when more executions exist than the page size.

## Failure indicators
- `total` equals `2` in the first request — the count is being taken from the page, not the full table.
- `total` differs between the two requests.
- `total` is absent from either response.
- `total` is `0` when executions clearly exist.

## Severity rationale
A wrong `total` breaks the Executions tab's pagination controls, causing the UI to show incorrect page counts or hide entries that exist.

## Source reference
`app/api/workflows/[slug]/executions/route.ts` lines 41–43 — `total` is computed by a separate `SELECT COUNT(*) as n FROM executions WHERE workflow_id = ?` query that has no `LIMIT` or `OFFSET`, making it independent of the pagination parameters.

## Notes
`total` counts all executions regardless of `status` (including `"running"` entries). The paginated `executions` array and `total` are always returned together in the same response object.
