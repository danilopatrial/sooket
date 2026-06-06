---
id: CONTRACT-LOG-03
title: GET logs on nonexistent slug returns 404
severity: medium
source_files:
  - app/api/workflows/[slug]/logs/route.ts
---

## What this tests
Verifies that `GET /api/workflows/[slug]/logs` returns HTTP 404 with an error body when the given slug does not correspond to any workflow in the database.

## Prerequisites
- App is running at http://localhost:3000
- The slug used in the request must not match any existing workflow

## Steps
1. Send a GET request using a slug that does not exist:
   ```
   curl -s -o /tmp/log03.json -w "%{http_code}" \
     http://localhost:3000/api/workflows/no-such-workflow-xyz/logs
   ```
2. Inspect the HTTP status code printed by the command.
3. Inspect the response body in `/tmp/log03.json`.

## Expected result
- HTTP status code is `404`.
- Response body is `{"error":"Not found"}`.

## Failure indicators
- HTTP status code is not 404 (e.g., 200 with an empty `logs` array, or 500).
- Response body does not contain `"error":"Not found"`.
- Server returns an unhandled exception or stack trace.

## Severity rationale
Returning 404 for unknown slugs is a baseline REST contract requirement; silently returning an empty log list would mask routing errors.

## Source reference
`app/api/workflows/[slug]/logs/route.ts` line 34 — `if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });`

## Notes
Use a clearly invented slug (e.g., `no-such-workflow-xyz`) to avoid accidental collision with an existing workflow.
