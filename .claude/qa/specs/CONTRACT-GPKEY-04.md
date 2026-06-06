---
id: CONTRACT-GPKEY-04
title: POST /api/provider-keys missing key returns 400
severity: medium
source_files:
  - app/api/provider-keys/route.ts
---

## What this tests
Verifies that POST /api/provider-keys without a `key` field is rejected with HTTP 400.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. POST a body that omits `key`:
   ```
   curl -s -X POST http://localhost:3000/api/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic"}' | jq .
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
Storing an empty provider key would cause all AI node executions relying on that provider to fail silently with a bad credential.

## Source reference
`app/api/provider-keys/route.ts` — lines 10–12:
```ts
if (!provider || !key) {
  return NextResponse.json({ error: "Missing provider or key" }, { status: 400 });
}
```
