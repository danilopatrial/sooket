---
id: CONTRACT-WPKEY-01
title: POST provider key stores encrypted key for workflow
severity: high
source_files:
  - app/api/workflows/[slug]/provider-keys/route.ts
---

## What this tests
POST /api/workflows/[slug]/provider-keys with a valid `{provider, key}` body stores an encrypted provider key and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; obtain its slug by calling `POST /api/workflows` first
- `ENCRYPTION_SECRET` is set in the environment

## Steps
1. Create a workflow to get a slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wpkey-test"}' | jq -r '.slug'
   ```
2. Store a provider key for the workflow (replace `<slug>` with the value from step 1):
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-ant-test-key-123"}'
   ```

## Expected result
HTTP 200 with response body:
```json
{"ok": true}
```
The key is stored encrypted in the `workflow_provider_keys` table — the plain-text value `sk-ant-test-key-123` does not appear in any API response.

## Failure indicators
- Response status is not 200
- Response body is not `{"ok": true}`
- Any error message or stack trace in the response body

## Severity rationale
Provider keys are the credentials that enable AI and external service nodes; failure to store them would break all AI-powered workflow executions.

## Source reference
`app/api/workflows/[slug]/provider-keys/route.ts` lines 7–31 — POST handler validates input, encrypts the key via `encrypt()`, and upserts into `workflow_provider_keys`.

## Notes
The key value is trimmed before encryption (`key.trim()`), so leading/trailing whitespace in the submitted value will not be stored.
