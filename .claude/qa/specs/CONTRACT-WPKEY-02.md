---
id: CONTRACT-WPKEY-02
title: POST same provider upserts existing workflow provider key
severity: medium
source_files:
  - app/api/workflows/[slug]/provider-keys/route.ts
---

## What this tests
POST /api/workflows/[slug]/provider-keys with a `provider` that already has a stored key overwrites the existing encrypted key rather than creating a duplicate.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a provider key already stored for a given provider (e.g., `anthropic`)

## Steps
1. Create a workflow and store an initial provider key (replace `<slug>` with the returned slug):
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wpkey-upsert-test"}' | jq -r '.slug'

   curl -s -X POST http://localhost:3000/api/workflows/<slug>/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-ant-first-key"}'
   ```
2. POST again to the same endpoint with the same `provider` but a different `key`:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-ant-second-key"}'
   ```
3. Confirm the response is still `{ok: true}` with HTTP 200.

## Expected result
Both POST requests return HTTP 200 `{"ok": true}`. The second call silently overwrites the first; no 409 conflict or error is returned. Only one row for `(workflow_id, provider)` exists in the database after both calls.

## Failure indicators
- Second POST returns a status other than 200
- Response body contains an error or conflict message
- A duplicate row is inserted (detectable by the next GET/list response showing two `anthropic` entries if such an endpoint existed)

## Severity rationale
Upsert semantics are essential for key rotation; a failure here would force users to delete and re-add keys, creating unnecessary downtime risk.

## Source reference
`app/api/workflows/[slug]/provider-keys/route.ts` lines 24–28 — `INSERT ... ON CONFLICT(workflow_id, provider) DO UPDATE SET encrypted_key = excluded.encrypted_key` implements the upsert.

## Notes
There is no GET endpoint for workflow provider keys, so the absence of a duplicate can only be confirmed indirectly (e.g., by verifying the second POST does not error and the key in use at runtime is the updated one).
