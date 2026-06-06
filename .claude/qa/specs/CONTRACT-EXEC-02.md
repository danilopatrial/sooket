---
id: CONTRACT-EXEC-02
title: GET executions with limit/offset paginates correctly
severity: medium
source_files:
  - app/api/workflows/[slug]/executions/route.ts
---

## What this tests
Verifies that the `?limit=` and `?offset=` query parameters correctly paginate the executions list, returning the expected slice of results while keeping `total` as the full count.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- More than 10 executions exist for the workflow (run the debug endpoint 11+ times if needed)

## Steps
1. If fewer than 11 executions exist, generate them:
   ```
   for i in $(seq 1 11); do
     curl -s -X POST http://localhost:3000/api/workflows/<slug>/debug \
       -H "Content-Type: application/json" \
       -d "{\"message\": \"run $i\"}" > /dev/null
   done
   ```
2. Fetch the first page (limit=10, offset=0) and note the IDs:
   ```
   curl -s "http://localhost:3000/api/workflows/<slug>/executions?limit=10&offset=0" \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print('count:', len(d['executions'])); print('total:', d['total']); print('ids:', [e['id'] for e in d['executions']])"
   ```
3. Fetch the second page (limit=10, offset=10) and note the IDs:
   ```
   curl -s "http://localhost:3000/api/workflows/<slug>/executions?limit=10&offset=10" \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print('count:', len(d['executions'])); print('total:', d['total']); print('ids:', [e['id'] for e in d['executions']])"
   ```
4. Confirm no ID appears in both pages.

## Expected result
- Page 1 returns exactly 10 entries; `total` is ≥ 11.
- Page 2 returns at least 1 entry (the remainder beyond the first 10).
- No `id` value appears in both page 1 and page 2 — pages are non-overlapping.
- `total` is identical on both pages (it reflects the full count, not the page).
- Both responses have HTTP status `200`.

## Failure indicators
- Page 1 returns fewer or more than 10 entries when 11+ executions exist.
- The same `id` appears in both pages — offset is not being applied.
- `total` differs between the two pages.
- `total` equals the `limit` value rather than the full count.

## Severity rationale
Broken pagination would cause the Executions tab to show duplicate or missing entries when a workflow has many executions.

## Source reference
`app/api/workflows/[slug]/executions/route.ts` lines 20–21 — `limit` and `offset` are parsed from query params and applied directly to the SQL query.  
Lines 37–38 — `ORDER BY e.id DESC LIMIT ? OFFSET ?` applies the pagination.  
Lines 41–43 — `total` is a separate `SELECT COUNT(*)` unaffected by limit/offset.

## Notes
`offset` is clamped to a minimum of 0 (negative values become 0). If `limit` is not supplied, it defaults to 50.
