---
id: CONTRACT-ACCT-02
title: POST /api/account/api-key is idempotent
severity: high
source_files:
  - app/api/account/api-key/route.ts
---

## What this tests
Repeated POST calls to `/api/account/api-key` return the same key value without generating a new one.

## Prerequisites
- App is running at http://localhost:3000
- SQLite database is accessible

## Steps
1. Send the first POST request:
   ```
   curl -s -X POST http://localhost:3000/api/account/api-key
   ```
   Record the `api_key` value from the response.

2. Send a second POST request:
   ```
   curl -s -X POST http://localhost:3000/api/account/api-key
   ```
   Record the `api_key` value from the response.

3. Compare the two `api_key` values.

## Expected result
Both responses return HTTP 200 with `{"api_key": "<same-value>"}`. The `api_key` string in the second response is byte-for-byte identical to the one returned in the first response.

## Failure indicators
- The second call returns a different `api_key` value than the first call.
- Either call returns a non-200 status code.
- The response JSON does not contain the `api_key` field.

## Severity rationale
A non-idempotent key endpoint would silently rotate the management key, breaking all integrations that cached the original value.

## Source reference
`app/api/account/api-key/route.ts` — the handler checks `SELECT value FROM settings WHERE key = 'api_key'` and returns the stored value if present, only generating a new key when none exists.

## Notes
If the database is freshly initialised with no prior key, the first call will generate and persist a `sk-mw-{uuid-without-hyphens}` key. Subsequent calls must return that same persisted value.
