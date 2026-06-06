---
id: CONTRACT-WVAR-03
title: POST same variable name upserts existing value
severity: medium
source_files:
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
`POST /api/workflows/[slug]/variables` with a `name` that already exists overwrites the stored variable rather than creating a duplicate or returning an error.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; substitute its slug for `{slug}` in all commands below

## Steps
1. Create a workflow and note its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wvar03-test"}' | jq -r '.slug'
   ```
2. Create the initial variable:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/{slug}/variables \
     -H "Content-Type: application/json" \
     -d '{"name":"MY_TOKEN","value":"original-value"}'
   ```
3. POST again with the same name but a different value:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/{slug}/variables \
     -H "Content-Type: application/json" \
     -d '{"name":"MY_TOKEN","value":"updated-value"}'
   ```
4. Confirm only one entry for `MY_TOKEN` exists in the list:
   ```
   curl -s http://localhost:3000/api/workflows/{slug}/variables | jq '[.[] | select(.name == "MY_TOKEN")] | length'
   ```

## Expected result
- Step 2 returns HTTP 200 with `{"ok":true}`
- Step 3 returns HTTP 200 with `{"ok":true}` (no conflict error)
- Step 4 prints `1` — exactly one entry for `MY_TOKEN`, not two

## Failure indicators
- Step 3 returns a non-200 status code (e.g. 409 conflict)
- Step 4 prints `2` or more (duplicate rows were inserted)
- Step 3 returns an error body

## Severity rationale
Medium — upsert semantics are required for safe secret rotation; if the API rejected updates, users would need to delete and recreate variables to change their values.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` lines 51–55 — `INSERT INTO customer_variables … ON CONFLICT(workflow_id, name) DO UPDATE SET encrypted_value = excluded.encrypted_value` implements the upsert.

## Notes
None.
