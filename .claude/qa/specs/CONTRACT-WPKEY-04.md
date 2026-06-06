---
id: CONTRACT-WPKEY-04
title: POST provider-key missing key returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/provider-keys/route.ts
---

## What this tests
POST `/api/workflows/[slug]/provider-keys` with the `key` field missing returns HTTP 400 with an error body.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; substitute its slug for `{slug}` in all commands below

## Steps
1. Create a workflow and note its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wpkey04-test"}' | jq -r '.slug'
   ```
2. POST to the provider-keys endpoint with `provider` present but `key` omitted:
   ```
   curl -s -o /dev/null -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/{slug}/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic"}'
   ```
3. Capture the full response body:
   ```
   curl -s \
     -X POST http://localhost:3000/api/workflows/{slug}/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic"}'
   ```

## Expected result
- Step 2 prints `400`
- Step 3 returns `{"error":"Missing provider or key"}`

## Failure indicators
- Status code is not 400 (e.g. 200, 500)
- Response body does not contain an `error` field
- A provider key row is written to the database despite the missing `key`

## Severity rationale
Medium — missing-field validation prevents silent data corruption; failure would allow malformed rows in `workflow_provider_keys`.

## Source reference
`app/api/workflows/[slug]/provider-keys/route.ts` lines 15–17 — `if (!provider || !key)` guard returns `{ error: "Missing provider or key" }` with status 400.

## Notes
The same 400 guard fires when `provider` is missing (CONTRACT-WPKEY-03). Both missing fields share the same condition and error message.
