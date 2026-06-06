---
id: CONTRACT-WCRED-02
title: POST workflow credentials creates node-credential assignment
severity: high
source_files:
  - app/api/workflows/[slug]/credentials/route.ts
---

## What this tests
Verifies that POST `/api/workflows/[slug]/credentials` with a valid `{nodeId, credentialId}` body creates the assignment and returns HTTP 200 with `{"ok": true}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below
- A global credential exists; note its integer `id` (create via `POST /api/credentials` if needed)

## Steps
1. Create a global credential to link (if one does not already exist):
   ```
   curl -s -X POST http://localhost:3000/api/credentials \
     -H 'Content-Type: application/json' \
     -d '{"name":"test-cred","type":"api_key","key":"secret123"}' \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
   ```
   Note the credential `id`.
2. Link the credential to a node in the workflow:
   ```
   curl -s -o /tmp/wcred02.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/credentials \
     -H 'Content-Type: application/json' \
     -d '{"nodeId":"node-abc-123","credentialId":<credential-id>}'
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/wcred02.json`
4. Confirm the assignment appears in GET:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/credentials | \
     python3 -c "import sys,json; entries=json.load(sys.stdin); print(next((e for e in entries if e['nodeId']=='node-abc-123'), None))"
   ```

## Expected result
Step 2 returns HTTP `200`. Response body is `{"ok":true}`. Step 4 shows an entry with `nodeId: "node-abc-123"` and the matching `credentialId`, `name`, and `type`.

## Failure indicators
- HTTP status other than 200
- Response body is not `{"ok":true}`
- Assignment does not appear in subsequent GET

## Severity rationale
High: linking credentials to nodes is required for nodes that need authentication; a broken POST means no credentials can be configured.

## Source reference
`app/api/workflows/[slug]/credentials/route.ts` lines 39–41: `adapter.linkCredential(workflow.id, nodeId, credentialId); return NextResponse.json({ ok: true })` — no explicit status → HTTP 200.
