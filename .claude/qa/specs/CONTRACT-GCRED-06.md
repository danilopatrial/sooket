---
id: CONTRACT-GCRED-06
title: DELETE /api/credentials with valid id removes credential
severity: medium
source_files:
  - app/api/credentials/route.ts
---

## What this tests
Verifies that DELETE /api/credentials?id=<id> with a valid integer `id` removes the credential and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Create a credential to delete and capture its `id`:
   ```
   curl -s -X POST http://localhost:3000/api/credentials \
     -H "Content-Type: application/json" \
     -d '{"name":"ToDelete","type":"api_key","key":"sk-temp-999"}' | jq .
   ```
   Note the `id` value in the response.

2. Delete the credential by its `id`:
   ```
   curl -s -X DELETE "http://localhost:3000/api/credentials?id=<id>" | jq .
   ```

3. Confirm the credential no longer appears in the list:
   ```
   curl -s http://localhost:3000/api/credentials | jq .
   ```

## Expected result
Step 2 returns HTTP 200 with body:
```json
{ "ok": true }
```
Step 3 returns an array that does not contain any entry with `name: "ToDelete"`.

## Failure indicators
- Step 2 returns a status other than 200.
- Step 2 response body does not contain `"ok": true`.
- Step 3 still shows an entry with `name: "ToDelete"`.

## Severity rationale
Credential deletion is essential for rotating secrets; failure would leave stale encrypted keys in the store with no removal path.

## Source reference
`app/api/credentials/route.ts` — lines 25–38 (DELETE handler): reads `id` from `searchParams`, validates it is a positive integer, calls `adapter.deleteCredential(id)`, returns `{ ok: true }`.
