---
id: CONTRACT-WVAR-09
title: DELETE variable without name param returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
Verifies that DELETE /api/workflows/[slug]/variables without a `name` query param is rejected with HTTP 400 and a "Missing name" error.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; note its slug (e.g. `abc1234567`)

## Steps
1. Create a workflow if one does not exist:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"test"}' | jq .
   ```
   Note the `slug` value returned.

2. Send DELETE with no query parameters:
   ```
   curl -s -X DELETE "http://localhost:3000/api/workflows/<slug>/variables" | jq .
   ```

## Expected result
HTTP status `400` with response body:
```json
{ "error": "Missing name" }
```

## Failure indicators
- HTTP status other than 400 (e.g. 200 or 500) indicates the guard is not in place.
- Response body does not contain `"error": "Missing name"`.

## Severity rationale
Without this guard a bare DELETE could attempt to run a query with a null name parameter, leading to undefined deletion behavior.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` — lines 65–67:
```ts
const name = searchParams.get("name");
if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
```
