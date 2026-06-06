---
id: CONTRACT-WPKEY-06
title: DELETE provider-key without provider param returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/provider-keys/route.ts
---

## What this tests
DELETE `/api/workflows/[slug]/provider-keys` with no `provider` query parameter returns HTTP 400 with an error body.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; substitute its slug for `{slug}` in all commands below

## Steps
1. Create (or reuse) a workflow and note its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wpkey06-test"}' | jq -r '.slug'
   ```
2. Send a DELETE request with no `provider` query param — capture the status code:
   ```
   curl -s -o /dev/null -w "%{http_code}" \
     -X DELETE "http://localhost:3000/api/workflows/{slug}/provider-keys"
   ```
3. Capture the full response body:
   ```
   curl -s -X DELETE \
     "http://localhost:3000/api/workflows/{slug}/provider-keys"
   ```

## Expected result
- Step 2 prints `400`
- Step 3 returns `{"error":"Missing provider"}`

## Failure indicators
- Status code is not 400 (e.g. 200, 500)
- Response body does not contain an `error` field
- Any provider key row is deleted despite the missing query param

## Severity rationale
Medium — missing-parameter validation prevents accidental bulk deletion or undefined behavior when the provider identifier is omitted.

## Source reference
`app/api/workflows/[slug]/provider-keys/route.ts` lines 40–42 — `const provider = searchParams.get("provider"); if (!provider) return NextResponse.json({ error: "Missing provider" }, { status: 400 });`

## Notes
None.
