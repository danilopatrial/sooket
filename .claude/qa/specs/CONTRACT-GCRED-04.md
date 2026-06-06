---
id: CONTRACT-GCRED-04
title: POST /api/credentials missing type returns 400
severity: medium
source_files:
  - app/api/credentials/route.ts
---

## What this tests
Verifies that POST /api/credentials without a `type` field is rejected with HTTP 400.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. POST a credential body that omits `type`:
   ```
   curl -s -X POST http://localhost:3000/api/credentials \
     -H "Content-Type: application/json" \
     -d '{"name":"MyCred","key":"sk-abc-123"}' | jq .
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
- A subsequent GET to `http://localhost:3000/api/credentials` shows a new entry created from this request.

## Severity rationale
The `type` field identifies the credential category displayed in the UI; accepting typeless credentials would produce unclassified records that cannot be meaningfully used.

## Source reference
`app/api/credentials/route.ts` — lines 15–17:
```ts
if (!name || !type || !key) {
  return NextResponse.json({ error: "Missing name, type, or key" }, { status: 400 });
}
```
