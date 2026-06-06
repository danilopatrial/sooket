---
id: CONTRACT-WCRED-05
title: DELETE workflow credential by nodeId removes assignment
severity: high
source_files:
  - app/api/workflows/[slug]/credentials/route.ts
---

## What this tests
Verifies that DELETE `/api/workflows/[slug]/credentials?nodeId=<nodeId>` removes the credential assignment for that node and returns `{"ok": true}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with an active node-credential assignment; substitute `slug` and `nodeId` below

## Steps
1. Create a credential and link it to a node (if not already done):
   ```
   CRED_ID=$(curl -s -X POST http://localhost:3000/api/credentials \
     -H 'Content-Type: application/json' \
     -d '{"name":"unlink-test","type":"api_key","key":"secret"}' \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/credentials \
     -H 'Content-Type: application/json' \
     -d "{\"nodeId\":\"node-to-unlink\",\"credentialId\":$CRED_ID}"
   ```
2. Delete the assignment:
   ```
   curl -s -o /tmp/wcred05.json -w "%{http_code}" \
     -X DELETE "http://localhost:3000/api/workflows/<slug>/credentials?nodeId=node-to-unlink"
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/wcred05.json`
4. Confirm the assignment is gone:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/credentials | \
     python3 -c "import sys,json; entries=json.load(sys.stdin); print('present:', any(e['nodeId']=='node-to-unlink' for e in entries))"
   ```

## Expected result
Step 2 returns HTTP `200`. Response body is `{"ok":true}`. Step 4 prints `present: False`.

## Failure indicators
- HTTP status other than 200
- Response body is not `{"ok":true}`
- Assignment still appears in GET after deletion

## Severity rationale
High: unlinking credentials is required when reassigning or removing a node; a broken DELETE leaves stale credentials attached to nodes.

## Source reference
`app/api/workflows/[slug]/credentials/route.ts` lines 55–57: `adapter.unlinkCredential(workflow.id, nodeId); return NextResponse.json({ ok: true })`.

## Notes
The handler does not check whether an assignment for `nodeId` actually existed before calling `unlinkCredential`; a DELETE for a non-existent `nodeId` also returns HTTP 200 `{"ok":true}` (silent no-op). Verify in source: line 56.
