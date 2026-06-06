---
id: CONTRACT-WF-10
title: DELETE active workflow returns 409
severity: high
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
Verifies that attempting to delete an active workflow via `DELETE /api/workflows/[slug]` returns HTTP 409 with an appropriate error message.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists and is active (`is_active = 1`)
- The active workflow's slug is known (referred to as `<active-slug>` below)

## Steps
1. Identify an active workflow slug. If none exists, first activate one:
   ```
   curl -s -X PATCH http://localhost:3000/api/workflows/<any-slug> \
     -H "Content-Type: application/json" \
     -d '{"is_active": true}'
   ```
2. Attempt to delete the active workflow:
   ```
   curl -s -o /tmp/wf10.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<active-slug>
   ```
3. Inspect the HTTP status code printed by the command above.
4. Inspect the response body in `/tmp/wf10.json`.

## Expected result
- HTTP status code is `409`.
- Response body is `{"error":"Cannot delete an active workflow"}`.
- The workflow still exists: a subsequent `GET /api/workflows/<active-slug>` returns 200.

## Failure indicators
- HTTP status code is not 409 (e.g., 200 or 204 would mean the workflow was deleted).
- Response body does not contain the `error` field.
- The workflow is gone after the request (GET returns 404).

## Severity rationale
Deleting an active workflow would take the live API endpoint offline; the 409 guard is a critical data-integrity safeguard.

## Source reference
`app/api/workflows/[slug]/route.ts` line 36 — `if (workflow.is_active) return NextResponse.json({ error: "Cannot delete an active workflow" }, { status: 409 });`

## Notes
The check is performed against the SQLite `is_active` column; a value of `1` (truthy) triggers the 409. A value of `0` allows deletion.
