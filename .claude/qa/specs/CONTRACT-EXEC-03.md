---
id: CONTRACT-EXEC-03
title: GET executions with limit=999 is capped at 200
severity: low
source_files:
  - app/api/workflows/[slug]/executions/route.ts
---

## What this tests
Verifies that passing `?limit=999` (or any value above 200) to `GET /api/workflows/[slug]/executions` results in at most 200 entries returned, not 999.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- More than 200 executions exist for the workflow (if not, the test still confirms the cap is applied server-side — result count will be min(actual_count, 200))

## Steps
1. Send a GET request with `limit=999`:
   ```
   curl -s "http://localhost:3000/api/workflows/<slug>/executions?limit=999" \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print('returned:', len(d['executions']), 'total:', d['total'])"
   ```
2. Note the count of entries returned vs the `total`.

## Expected result
- HTTP status code is `200`.
- The count of entries in `executions` is at most `200`, even though `limit=999` was requested.
- `total` correctly reflects the full execution count (uncapped).
- If fewer than 200 executions exist, the returned count equals the actual total (the cap does not artificially reduce a smaller set).

## Failure indicators
- More than 200 entries are returned — the cap is not being enforced.
- The server returns a 400 or 500 for `limit=999` instead of silently capping it.
- `total` equals `200` when more than 200 executions exist (total should be the real count, not the capped limit).

## Severity rationale
Without the 200-entry cap, a caller passing a large limit could trigger an unbounded database read, degrading server performance.

## Source reference
`app/api/workflows/[slug]/executions/route.ts` line 20 — `const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200)` clamps any supplied limit to a maximum of 200.

## Notes
The cap is applied silently — the response does not include a header or field indicating that the requested limit was reduced. A `total` greater than the returned count is the only signal that more entries exist.
