---
id: CONTRACT-WVAR-06
title: POST variable with spaces in name returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
Verifies that POSTing a variable whose name contains spaces is rejected with HTTP 400 and an UPPER_SNAKE_CASE error message.

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

2. POST a variable with a space in the name:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/variables \
     -H "Content-Type: application/json" \
     -d '{"name":"MY KEY","value":"secret123"}' | jq .
   ```

## Expected result
HTTP status `400` with response body:
```json
{ "error": "Name must be UPPER_SNAKE_CASE (e.g. MY_KEY)" }
```
No variable is created in the database.

## Failure indicators
- HTTP status other than 400 indicates the validation was not enforced.
- Response body does not contain `"error"` key, or the message differs from `"Name must be UPPER_SNAKE_CASE (e.g. MY_KEY)"`.
- A subsequent GET to `http://localhost:3000/api/workflows/<slug>/variables` returns a row with `name: "MY KEY"`.

## Severity rationale
Variable name validation protects runtime expression resolution; names with spaces cannot be used in `{{ $vars.VAR_NAME }}` references and would silently fail at runtime.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` — line 6 (`NAME_RE = /^[A-Z][A-Z0-9_]*$/`) and lines 38–43 (validation guard returning 400). The character class `[A-Z0-9_]` does not include spaces, so `"MY KEY"` fails the regex.

## Notes
The same 400 path is triggered by lowercase names and digit-leading names — those are covered by separate checklist items. This spec targets only names containing space characters.
