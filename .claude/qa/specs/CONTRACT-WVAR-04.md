---
id: CONTRACT-WVAR-04
title: POST variable with lowercase name returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
Verifies that POSTing a variable whose name contains lowercase letters is rejected with HTTP 400 and an UPPER_SNAKE_CASE error message.

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

2. POST a variable with a lowercase name to the workflow:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/variables \
     -H "Content-Type: application/json" \
     -d '{"name":"my_key","value":"secret123"}' | jq .
   ```

## Expected result
HTTP status `400` with response body:
```json
{ "error": "Name must be UPPER_SNAKE_CASE (e.g. MY_KEY)" }
```
No variable is created in the database.

## Failure indicators
- HTTP status other than 400 (e.g. 200 or 201) indicates the validation was not enforced.
- Response body does not contain `"error"` key, or error message differs from `"Name must be UPPER_SNAKE_CASE (e.g. MY_KEY)"`.
- A subsequent GET to `http://localhost:3000/api/workflows/<slug>/variables` returns a row with `name: "my_key"`.

## Severity rationale
Variable name validation protects runtime expression resolution; accepting invalid names would silently break `{{ $vars.VAR_NAME }}` references.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` — line 6 (`NAME_RE = /^[A-Z][A-Z0-9_]*$/`) and lines 38–43 (validation guard returning 400).

## Notes
The same 400 path is triggered by names starting with a digit, containing spaces, or being empty — those are covered by separate checklist items. This spec covers only the lowercase letter case.
