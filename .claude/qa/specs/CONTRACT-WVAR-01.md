---
id: CONTRACT-WVAR-01
title: GET variables returns names only, never values
severity: high
source_files:
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
`GET /api/workflows/[slug]/variables` returns an array of `{name, created_at}` objects — the encrypted variable values are never included in the response.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; substitute its slug for `{slug}` in all commands below

## Steps
1. Create a workflow and note its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wvar01-test"}' | jq -r '.slug'
   ```
2. Store a variable with a known secret value:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/{slug}/variables \
     -H "Content-Type: application/json" \
     -d '{"name":"MY_SECRET","value":"super-secret-value"}'
   ```
3. Retrieve the variables list:
   ```
   curl -s http://localhost:3000/api/workflows/{slug}/variables
   ```

## Expected result
- Step 2 returns `{"ok":true}` with HTTP 200
- Step 3 returns HTTP 200 with a JSON array; each element contains `name` and `created_at` fields
- The string `"super-secret-value"` does **not** appear anywhere in the step 3 response
- Neither `encrypted_value` nor `value` fields appear in any array element

## Failure indicators
- The response contains a `value` or `encrypted_value` field on any entry
- The plaintext secret (`"super-secret-value"`) is present anywhere in the response body
- Step 3 returns a non-200 status code

## Severity rationale
High — leaking variable values in list responses would expose all stored secrets (API keys, tokens) to anyone who can reach the management API.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` lines 24–28 — the SELECT query explicitly lists only `name, created_at`; `encrypted_value` is never selected or returned.

## Notes
None.
