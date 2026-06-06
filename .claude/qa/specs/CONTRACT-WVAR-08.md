---
id: CONTRACT-WVAR-08
title: DELETE variable with valid name removes it
severity: medium
source_files:
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
Verifies that DELETE /api/workflows/[slug]/variables with a valid `name` query param removes the variable and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; note its slug (e.g. `abc1234567`)

## Steps
1. Create a workflow if one does not exist:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"test"}' | jq .
   ```
   Note the `slug` value returned.

2. Create a variable to delete:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/variables \
     -H "Content-Type: application/json" \
     -d '{"name":"TO_DELETE","value":"tempval"}' | jq .
   ```

3. Delete the variable by name:
   ```
   curl -s -X DELETE "http://localhost:3000/api/workflows/<slug>/variables?name=TO_DELETE" | jq .
   ```

4. Confirm the variable no longer appears in the list:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/variables | jq .
   ```

## Expected result
Step 3 returns HTTP 200 with body:
```json
{ "ok": true }
```
Step 4 returns an array that does not contain any entry with `name: "TO_DELETE"`.

## Failure indicators
- Step 3 returns a status other than 200.
- Step 3 response body does not contain `"ok": true`.
- Step 4 still shows a row with `name: "TO_DELETE"`.

## Severity rationale
Variable deletion is a core lifecycle operation; failure would leave stale encrypted values in the store with no removal path.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` — lines 60–73 (DELETE handler): reads `name` from `searchParams`, runs `DELETE FROM customer_variables WHERE workflow_id = ? AND name = ?`, returns `{ ok: true }`.
