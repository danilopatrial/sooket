---
id: CONTRACT-GPKEY-02
title: POST /api/provider-keys same provider upserts key
severity: medium
source_files:
  - app/api/provider-keys/route.ts
---

## What this tests
Verifies that POSTing a provider key for a provider that already has a stored key overwrites (upserts) the existing entry rather than creating a duplicate or returning an error.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Store an initial key for a provider:
   ```
   curl -s -X POST http://localhost:3000/api/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-ant-original"}' | jq .
   ```

2. POST a new key for the same provider:
   ```
   curl -s -X POST http://localhost:3000/api/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-ant-updated"}' | jq .
   ```

## Expected result
Both requests return HTTP status `200` with body:
```json
{ "ok": true }
```
No 409 conflict error is returned. The second POST silently replaces the stored encrypted key for `anthropic`.

## Failure indicators
- Step 2 returns a status other than 200 (e.g. 409 conflict).
- Step 2 response body does not contain `"ok": true`.

## Severity rationale
Key rotation is a normal maintenance operation; an error on re-POST would force manual database intervention to update provider credentials.

## Source reference
`app/api/provider-keys/route.ts` — lines 16–20:
```sql
INSERT INTO provider_keys (provider, encrypted_key)
VALUES (?, ?)
ON CONFLICT(provider) DO UPDATE SET encrypted_key = excluded.encrypted_key
```
The `ON CONFLICT ... DO UPDATE` clause makes the operation an upsert.
