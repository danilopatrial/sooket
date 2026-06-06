---
id: CONTRACT-AKEY-12
title: DELETE api-key removes it successfully
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/[id]/route.ts
---

## What this tests
Verifies that DELETE `/api/workflows/[slug]/api-keys/[id]` removes the key and returns `{"ok": true}`, and that a non-existent or cross-workflow key returns 404.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with at least two active API keys so the last-active guard is not triggered

## Steps
1. Create a second key to delete (so the workflow retains at least one active key):
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"to-delete"}' \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['key']['id'])"
   ```
   Note the `id`.
2. Delete the key:
   ```
   curl -s -o /tmp/akey12.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/api-keys/<id>
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/akey12.json`
4. Confirm deletion:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys | \
     python3 -c "import sys,json; keys=json.load(sys.stdin)['keys']; print('id present:', any(k['id']==<id> for k in keys))"
   ```
5. Attempt to delete a non-existent id:
   ```
   curl -s -o /tmp/akey12b.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/api-keys/999999
   ```

## Expected result
Step 2 returns HTTP `200` with `{"ok":true}`. Step 4 prints `False` (key no longer in list). Step 5 returns HTTP `404` with `{"error":"Key not found"}`.

## Failure indicators
- HTTP status other than 200 on a valid delete
- Key still appears in the list after deletion
- Non-existent id returns 200 instead of 404

## Severity rationale
High: delete is the permanent revocation path; a broken delete leaves decommissioned keys active.

## Source reference
`app/api/workflows/[slug]/api-keys/[id]/route.ts` lines 104–107: returns 404 if key not found for this workflow; lines 119–120: `DELETE … WHERE id = ? AND workflow_id = ?`, returns `{ok: true}`.
