---
id: CONTRACT-DBG-05
title: POST debug on nonexistent slug returns 404
severity: medium
source_files:
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
Verifies that `POST /api/workflows/[slug]/debug` returns HTTP 404 with an error message when the given slug does not correspond to any workflow in the database.

## Prerequisites
- App is running at http://localhost:3000
- The slug used in the request must not match any existing workflow

## Steps
1. Send a POST request to a debug endpoint with a non-existent slug:
   ```
   curl -s -o /tmp/dbg05.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/no-such-workflow-xyz/debug \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```
2. Inspect the HTTP status code printed by the command.
3. Inspect the response body in `/tmp/dbg05.json`.

## Expected result
- HTTP status code is `404`.
- Response body is `{"error":"Workflow not found"}`.

## Failure indicators
- HTTP status code is not 404 (e.g., 200 or 500).
- Response body does not contain `"error":"Workflow not found"`.
- The server crashes or returns an unhandled exception response.

## Severity rationale
A missing 404 guard could mask routing misconfigurations and expose undefined behavior; proper error handling is a baseline contract expectation.

## Source reference
`app/api/workflows/[slug]/debug/route.ts` line 22 — `if (!workflowRow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });`

## Notes
Use a slug that is clearly invented (e.g., `no-such-workflow-xyz`) to avoid accidental collision with an existing workflow.
