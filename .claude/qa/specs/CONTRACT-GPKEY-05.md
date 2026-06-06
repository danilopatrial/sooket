---
id: CONTRACT-GPKEY-05
title: DELETE /api/provider-keys with valid provider removes key
severity: medium
source_files:
  - app/api/provider-keys/route.ts
---

## What this tests
Verifies that DELETE /api/provider-keys?provider=<name> with a valid `provider` query param removes the stored key and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Store a provider key to delete:
   ```
   curl -s -X POST http://localhost:3000/api/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-ant-to-delete"}' | jq .
   ```

2. Delete the key by provider name:
   ```
   curl -s -X DELETE "http://localhost:3000/api/provider-keys?provider=anthropic" | jq .
   ```

## Expected result
Step 2 returns HTTP status `200` with body:
```json
{ "ok": true }
```

## Failure indicators
- Step 2 returns a status other than 200.
- Step 2 response body does not contain `"ok": true`.

## Severity rationale
Provider key deletion is required for credential rotation; failure would leave stale keys in the store with no removal path.

## Source reference
`app/api/provider-keys/route.ts` — lines 25–33 (DELETE handler): reads `provider` from `searchParams`, runs `DELETE FROM provider_keys WHERE provider = ?`, returns `{ ok: true }`.
