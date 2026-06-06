---
id: CONTRACT-GCRED-05
title: POST /api/credentials missing key returns 400
severity: medium
source_files:
  - app/api/credentials/route.ts
---

## What this tests
Verifies that POST /api/credentials without a `key` field is rejected with HTTP 400.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. POST a credential body that omits `key`:
   ```
   curl -s -X POST http://localhost:3000/api/credentials \
     -H "Content-Type: application/json" \
     -d '{"name":"MyCred","type":"api_key"}' | jq .
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
Accepting a credential with no secret key would store an empty encrypted value, causing silent authentication failures at runtime when the credential is used by a node.

## Source reference
`app/api/credentials/route.ts` — lines 15–17:
```ts
if (!name || !type || !key) {
  return NextResponse.json({ error: "Missing name, type, or key" }, { status: 400 });
}
```
