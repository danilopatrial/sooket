---
id: CONTRACT-GPKEY-06
title: DELETE /api/provider-keys without provider returns 400
severity: medium
source_files:
  - app/api/provider-keys/route.ts
---

## What this tests
Verifies that DELETE /api/provider-keys without a `provider` query param is rejected with HTTP 400 and a "Missing provider" error.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Send DELETE with no query parameters:
   ```
   curl -s -X DELETE "http://localhost:3000/api/provider-keys" | jq .
   ```

## Expected result
HTTP status `400` with response body:
```json
{ "error": "Missing provider" }
```
No key is deleted.

## Failure indicators
- HTTP status other than 400.
- Response body does not contain `"error": "Missing provider"`.

## Severity rationale
Without this guard a bare DELETE could run `DELETE FROM provider_keys WHERE provider = NULL`, potentially deleting unexpected rows depending on the SQLite NULL handling.

## Source reference
`app/api/provider-keys/route.ts` — line 29:
```ts
if (!provider) return NextResponse.json({ error: "Missing provider" }, { status: 400 });
```
