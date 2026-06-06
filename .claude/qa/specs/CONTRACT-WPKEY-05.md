---
id: CONTRACT-WPKEY-05
title: DELETE provider-key with valid provider removes key
severity: medium
source_files:
  - app/api/workflows/[slug]/provider-keys/route.ts
---

## What this tests
DELETE `/api/workflows/[slug]/provider-keys?provider={provider}` with a valid `provider` query parameter removes the stored provider key and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; substitute its slug for `{slug}` in all commands below

## Steps
1. Create a workflow and note its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wpkey05-test"}' | jq -r '.slug'
   ```
2. Store a provider key so there is a row to delete:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/{slug}/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-test-1234"}'
   ```
3. Delete the provider key via query param:
   ```
   curl -s -X DELETE \
     "http://localhost:3000/api/workflows/{slug}/provider-keys?provider=anthropic"
   ```
4. Attempt to add the same provider key again and verify no leftover conflict (optional sanity check):
   ```
   curl -s -X POST http://localhost:3000/api/workflows/{slug}/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"provider":"anthropic","key":"sk-new-5678"}'
   ```

## Expected result
- Step 2 returns `{"ok":true}` with HTTP 200
- Step 3 returns `{"ok":true}` with HTTP 200
- After step 3 the `workflow_provider_keys` row for that workflow + provider no longer exists
- Step 4 (if performed) succeeds without conflict, confirming the row was removed

## Failure indicators
- Step 3 returns a non-200 status code
- Step 3 response body does not contain `{"ok":true}`
- The provider key row remains in the database after the DELETE call

## Severity rationale
Medium — inability to remove a provider key would prevent users from rotating or revoking credentials stored for a workflow.

## Source reference
`app/api/workflows/[slug]/provider-keys/route.ts` lines 33–50 — DELETE handler reads `provider` from `searchParams`, then executes `DELETE FROM workflow_provider_keys WHERE workflow_id = ? AND provider = ?` and returns `{ ok: true }`.

## Notes
The DELETE handler does not distinguish between "key existed and was deleted" and "key did not exist" — both return `{"ok":true}`. This is by design; the spec tests the common case where a key was previously stored.
