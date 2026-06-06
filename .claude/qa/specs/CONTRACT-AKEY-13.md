---
id: CONTRACT-AKEY-13
title: DELETE last active api-key returns 409
severity: critical
source_files:
  - app/api/workflows/[slug]/api-keys/[id]/route.ts
---

## What this tests
Verifies that DELETE on the only remaining active API key returns HTTP 409 with `{"error": "Cannot delete the last active key for this workflow"}` and leaves the key intact.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with exactly one active API key; substitute its `slug` and key `id` below

## Steps
1. Confirm only one active key exists:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys | \
     python3 -c "import sys,json; keys=json.load(sys.stdin)['keys']; active=[k for k in keys if k['is_active']]; print('active count:', len(active))"
   ```
2. Attempt to delete the last active key:
   ```
   curl -s -o /tmp/akey13.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/api-keys/<id>
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/akey13.json`
4. Confirm the key still exists and is active:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys | \
     python3 -c "import sys,json; keys=json.load(sys.stdin)['keys']; k=next((k for k in keys if k['id']==<id>), None); print('exists:', k is not None, 'active:', k['is_active'] if k else 'N/A')"
   ```

## Expected result
Step 2 returns HTTP `409`. Response body is `{"error":"Cannot delete the last active key for this workflow"}`. The key is still present and active in step 4.

## Failure indicators
- HTTP 200 returned and key is deleted (workflow left with no active key)
- Error message differs from `"Cannot delete the last active key for this workflow"`
- HTTP status other than 409

## Severity rationale
Critical: deleting the last active key makes the workflow permanently unreachable at `/api/v1/chat` with no way to authenticate new requests.

## Source reference
`app/api/workflows/[slug]/api-keys/[id]/route.ts` lines 110–116: `if (existing.is_active)` checks `activeCount <= 1` and returns 409 `"Cannot delete the last active key for this workflow"`.
