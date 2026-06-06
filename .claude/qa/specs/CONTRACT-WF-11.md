---
id: CONTRACT-WF-11
title: DELETE nonexistent workflow slug returns 404
severity: medium
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
Verifies that `DELETE /api/workflows/[slug]` returns HTTP 404 when the given slug does not exist in the database.

## Prerequisites
- App is running at http://localhost:3000
- The slug used in the request must not correspond to any existing workflow

## Steps
1. Send a DELETE request to a slug that does not exist:
   ```
   curl -s -o /tmp/wf11.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/does-not-exist-xyz
   ```
2. Inspect the HTTP status code printed by the command.
3. Inspect the response body in `/tmp/wf11.json`.

## Expected result
- HTTP status code is `404`.
- Response body is `{"error":"Not found"}`.

## Failure indicators
- HTTP status code is not 404 (e.g., 200, 204, or 500).
- Response body does not contain the `error` field with value `"Not found"`.

## Severity rationale
Returning a proper 404 for unknown slugs is a baseline REST contract expectation; incorrect behavior (e.g., 200 or 500) would indicate broken routing or unhandled errors.

## Source reference
`app/api/workflows/[slug]/route.ts` line 35 — `if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });`

## Notes
Use a clearly invented slug (e.g., `does-not-exist-xyz`) that is unlikely to collide with any real workflow. The slug lookup is performed via `SELECT id, is_active FROM workflows WHERE slug = ?`.
