---
id: CONTRACT-ACL-09
title: DELETE access-list entry by id removes it
severity: high
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that DELETE `/api/workflows/[slug]/access-list?id=<id>` removes the entry and returns `{"ok": true}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Create an entry to delete:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"to-delete","rule_type":"value"}' \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['entry']['id'])"
   ```
   Note the returned `id`.
2. Delete the entry:
   ```
   curl -s -o /tmp/acl09.json -w "%{http_code}" \
     -X DELETE "http://localhost:3000/api/workflows/<slug>/access-list?id=<id>"
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/acl09.json`
4. Confirm deletion:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/access-list
   ```
   Verify the deleted `id` is no longer present in `entries`.

## Expected result
Step 2 returns HTTP `200`. Response body is `{"ok":true}`. The entry is absent from the list in step 4.

## Failure indicators
- HTTP status other than 200
- Response body is not `{"ok":true}`
- Entry still appears in the list after deletion

## Severity rationale
High: delete is the only way to remove access list entries; a broken delete leaves rules that cannot be cleared.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 61–74: `DELETE FROM workflow_access_lists WHERE id = ? AND workflow_id = ?`, returns `{ok: true}`.

## Notes
The handler does not check `result.changes`, so DELETE with a non-existent `id` (but valid slug) also returns HTTP 200 `{"ok":true}` rather than 404 — this is silent no-op behavior. Verify in source: line 71.
