---
id: CONTRACT-GCRED-03
title: POST /api/credentials missing name returns 400
severity: medium
source_files:
  - app/api/credentials/route.ts
---

## What this tests
Verifies that POST /api/credentials without a `name` field is rejected with HTTP 400.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. POST a credential body that omits `name`:
   ```
   curl -s -X POST http://localhost:3000/api/credentials \
     -H "Content-Type: application/json" \
     -d '{"type":"api_key","key":"sk-abc-123"}' | jq .
   ```

## Expected result
HTTP status `400` with response body:
```json
{ "error": "Missing name, type, or key" }
```
No credential is created.

## Failure indicators
- HTTP status other than 400.
- Response body does not contain `"error": "Missing name, type, or key"`.
- A subsequent GET to `http://localhost:3000/api/credentials` shows a new entry with no name.

## Severity rationale
Accepting nameless credentials would create unidentifiable records in the global credential pool that cannot be selected by the UI.

## Source reference
`app/api/credentials/route.ts` — lines 15–17:
```ts
if (!name || !type || !key) {
  return NextResponse.json({ error: "Missing name, type, or key" }, { status: 400 });
}
```
