---
id: CONTRACT-WF-04
title: GET nonexistent workflow slug returns 404
severity: high
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
GET /api/workflows/[slug] returns HTTP 404 with `{"error":"Not found"}` when no workflow exists for the given slug.

## Prerequisites
- App is running at http://localhost:3000
- The slug `nonexistent-slug-xyz` does not exist in the database

## Steps
1. Run:
   ```
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/workflows/nonexistent-slug-xyz
   ```
2. Run with response body:
   ```
   curl -s http://localhost:3000/api/workflows/nonexistent-slug-xyz
   ```

## Expected result
- HTTP status code is `404`
- Response body is `{"error":"Not found"}`

## Failure indicators
- Status code is `200` or `500` instead of `404`
- Response body does not contain `"error"` key or contains a stack trace

## Severity rationale
Callers rely on 404 to distinguish missing workflows from other errors; an incorrect status code breaks client error handling.

## Source reference
`app/api/workflows/[slug]/route.ts` line 13: `if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });`

## Notes
Use any slug string that is guaranteed not to exist. Avoid slugs that could coincidentally match an existing workflow in the test environment.
