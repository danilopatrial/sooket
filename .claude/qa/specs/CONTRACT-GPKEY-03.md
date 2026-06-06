---
id: CONTRACT-GPKEY-03
title: POST /api/provider-keys missing provider returns 400
severity: medium
source_files:
  - app/api/provider-keys/route.ts
---

## What this tests
Verifies that POST /api/provider-keys without a `provider` field is rejected with HTTP 400.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. POST a body that omits `provider`:
   ```
   curl -s -X POST http://localhost:3000/api/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"key":"sk-ant-test-123"}' | jq .
   ```

## Expected result
HTTP status `400` with response body:
```json
{ "error": "Missing provider or key" }
```
No key is stored.

## Failure indicators
- HTTP status other than 400.
- Response body does not contain `"error": "Missing provider or key"`.

## Severity rationale
A provider key stored without a provider name cannot be looked up at runtime and would be orphaned in the database.

## Source reference
`app/api/provider-keys/route.ts` — lines 10–12:
```ts
if (!provider || !key) {
  return NextResponse.json({ error: "Missing provider or key" }, { status: 400 });
}
```
