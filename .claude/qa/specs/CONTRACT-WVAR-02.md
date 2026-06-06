---
id: CONTRACT-WVAR-02
title: POST valid UPPER_SNAKE_CASE name creates variable
severity: high
source_files:
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
`POST /api/workflows/[slug]/variables` with a valid `UPPER_SNAKE_CASE` name and a non-empty value stores an encrypted variable and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; substitute its slug for `{slug}` in all commands below

## Steps
1. Create a workflow and note its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wvar02-test"}' | jq -r '.slug'
   ```
2. POST a variable with a valid UPPER_SNAKE_CASE name:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/{slug}/variables \
     -H "Content-Type: application/json" \
     -d '{"name":"MY_API_KEY","value":"plaintext-secret"}'
   ```
3. Confirm the variable appears in the list:
   ```
   curl -s http://localhost:3000/api/workflows/{slug}/variables | jq '.[] | select(.name == "MY_API_KEY")'
   ```

## Expected result
- Step 2 returns HTTP 200 with body `{"ok":true}`
- Step 3 returns a JSON object containing `"name": "MY_API_KEY"` and a `created_at` timestamp
- The plaintext value `"plaintext-secret"` is not visible in the list response

## Failure indicators
- Step 2 returns a non-200 status code or a body other than `{"ok":true}`
- Step 3 returns an empty array (variable was not persisted)
- The plaintext value appears in step 3's response

## Severity rationale
High — core write path for customer variables; failure means secrets cannot be injected into workflow execution at runtime.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` lines 31–58 — POST handler validates name against `NAME_RE = /^[A-Z][A-Z0-9_]*$/`, encrypts the value with `encrypt(value.trim(), SECRET)`, then upserts into `customer_variables`.

## Notes
The name regex `^[A-Z][A-Z0-9_]*$` requires the first character to be an uppercase letter; digits and underscores are allowed from the second character onward.
