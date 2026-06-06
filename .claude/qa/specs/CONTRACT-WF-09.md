---
id: CONTRACT-WF-09
title: DELETE inactive workflow returns ok true
severity: high
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
DELETE /api/workflows/[slug] on an inactive workflow deletes the workflow (and its request logs) and returns `{ok: true}` with HTTP 200.

## Prerequisites
- App is running at http://localhost:3000
- An inactive workflow exists; note its slug (e.g. `SLUG_A`)
- Confirm the workflow is inactive: GET /api/workflows/SLUG_A should return `"isActive": false`

## Steps
1. Confirm the target workflow is inactive:
   ```
   curl -s http://localhost:3000/api/workflows/SLUG_A
   ```
   Verify the response contains `"isActive":false`.

2. Delete the workflow:
   ```
   curl -s -X DELETE http://localhost:3000/api/workflows/SLUG_A
   ```

3. Confirm the workflow no longer exists:
   ```
   curl -s http://localhost:3000/api/workflows/SLUG_A
   ```

## Expected result
- Step 2 returns HTTP 200 with body `{"ok":true}`.
- Step 3 returns HTTP 404 with body `{"error":"Not found"}`.

## Failure indicators
- Step 2 returns any status other than 200.
- Step 2 response body does not contain `{"ok":true}`.
- Step 3 returns 200 instead of 404 (workflow was not actually deleted).

## Severity rationale
Deletion is a destructive, irreversible operation; confirming it works correctly for the allowed case is high severity.

## Source reference
`app/api/workflows/[slug]/route.ts` lines 24–41 — DELETE handler checks `is_active`, deletes `request_logs` for the workflow, then deletes the workflow row and returns `{ok: true}`.

## Notes
The DELETE handler also removes all `request_logs` rows for the workflow before deleting it. This cascade is internal and not directly observable via the public API, but the workflow absence after deletion (step 3) confirms the operation succeeded.
