---
id: CONTRACT-GCRED-07
title: DELETE /api/credentials with non-integer id returns 400
severity: low
source_files:
  - app/api/credentials/route.ts
---

## What this tests
Verifies that DELETE /api/credentials?id=<non-integer> is rejected with HTTP 400 and an "Invalid id" error.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Send DELETE with a non-integer `id` value:
   ```
   curl -s -X DELETE "http://localhost:3000/api/credentials?id=abc" | jq .
   ```

2. Also test with a negative integer to confirm it is also rejected:
   ```
   curl -s -X DELETE "http://localhost:3000/api/credentials?id=-1" | jq .
   ```

## Expected result
Both requests return HTTP status `400` with response body:
```json
{ "error": "Invalid id" }
```
No credential is deleted.

## Failure indicators
- Either request returns a status other than 400.
- Response body does not contain `"error": "Invalid id"`.
- Any credential is deleted as a side effect.

## Severity rationale
Input validation on the id parameter prevents accidental or malicious deletion via type-confused queries against the SQLite layer.

## Source reference
`app/api/credentials/route.ts` — lines 30–33:
```ts
const id = Number(raw);
if (!Number.isInteger(id) || id <= 0) {
  return NextResponse.json({ error: "Invalid id" }, { status: 400 });
}
```
`Number("abc")` produces `NaN`; `Number.isInteger(NaN)` is `false`, triggering the 400. Negative integers satisfy `id <= 0` and are also rejected.
