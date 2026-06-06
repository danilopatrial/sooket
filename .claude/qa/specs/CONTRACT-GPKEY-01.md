---
id: CONTRACT-GPKEY-01
title: POST /api/provider-keys with valid body stores key
severity: high
source_files:
  - app/api/provider-keys/route.ts
---

## What this tests
Verifies that POST /api/provider-keys with a valid `{provider, key}` body encrypts and stores the provider key, returning `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. POST a global provider key:
   ```
   curl -s -X POST http://localhost:3000/api/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-ant-test-123"}' | jq .
   ```

## Expected result
HTTP status `200` with response body:
```json
{ "ok": true }
```

## Failure indicators
- HTTP status other than 200.
- Response body does not contain `"ok": true`.

## Severity rationale
Global provider keys are required for AI nodes (Anthropic, etc.) to execute; a broken POST would silently prevent all AI-dependent workflows from running.

## Source reference
`app/api/provider-keys/route.ts` — lines 7–23: validates `provider` and `key` are present, encrypts the key with AES-GCM, upserts into `provider_keys` table, returns `{ ok: true }`.

## Notes
The raw key value is encrypted before storage via `encrypt(key.trim(), SECRET)`. There is no GET endpoint on `/api/provider-keys`; key presence can be confirmed indirectly through the workflow provider-keys UI or by verifying node execution succeeds.
