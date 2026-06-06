---
id: CONTRACT-WVAR-07
title: POST variable missing value returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
Verifies that POSTing a variable without a `value` field is rejected with HTTP 400 and a "Missing value" error message.

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

2. POST a variable with a valid name but omit the `value` field:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/variables \
     -H "Content-Type: application/json" \
     -d '{"name":"MY_KEY"}' | jq .
   ```

## Expected result
HTTP status `400` with response body:
```json
{ "error": "Missing value" }
```
No variable is created in the database.

## Failure indicators
- HTTP status other than 400 indicates the validation was not enforced.
- Response body does not contain `"error"` key, or the message differs from `"Missing value"`.
- A subsequent GET to `http://localhost:3000/api/workflows/<slug>/variables` returns a row with `name: "MY_KEY"`.

## Severity rationale
A variable with no value would store empty/undefined encrypted data; the validation prevents silent data corruption in the encrypted variable store.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` — lines 44–46:
```ts
if (!value || typeof value !== "string") {
  return NextResponse.json({ error: "Missing value" }, { status: 400 });
}
```

## Notes
This guard also fires when `value` is an empty string (`""`), since `!value` is truthy for empty strings. Sending `{"name":"MY_KEY","value":""}` will produce the same 400 response.
