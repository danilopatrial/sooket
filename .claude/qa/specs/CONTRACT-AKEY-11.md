---
id: CONTRACT-AKEY-11
title: PATCH disabling last active api-key returns 409
severity: critical
source_files:
  - app/api/workflows/[slug]/api-keys/[id]/route.ts
---

## What this tests
Verifies that PATCH with `is_active: false` on the only remaining active API key returns HTTP 409 with `{"error": "Cannot disable the last active key for this workflow"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with exactly one active API key; substitute its `slug` and key `id` below

## Steps
1. Ensure only one active key exists for the workflow:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys | \
     python3 -c "import sys,json; keys=json.load(sys.stdin)['keys']; active=[k for k in keys if k['is_active']]; print('active count:', len(active), [k['id'] for k in active])"
   ```
   If more than one active key exists, disable extras first (or use a fresh workflow with a single key).
2. Attempt to disable the last active key:
   ```
   curl -s -o /tmp/akey11.json -w "%{http_code}" \
     -X PATCH http://localhost:3000/api/workflows/<slug>/api-keys/<id> \
     -H 'Content-Type: application/json' \
     -d '{"is_active":false}'
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/akey11.json`
4. Confirm the key is still active:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys | \
     python3 -c "import sys,json; keys=json.load(sys.stdin)['keys']; print(next(k['is_active'] for k in keys if k['id']==<id>))"
   ```

## Expected result
Step 2 returns HTTP `409`. Response body is `{"error":"Cannot disable the last active key for this workflow"}`. The key remains active in step 4.

## Failure indicators
- HTTP 200 returned and key is disabled (workflow left with no active key)
- Error message differs from `"Cannot disable the last active key for this workflow"`
- HTTP status other than 409

## Severity rationale
Critical: leaving a workflow with zero active keys makes it permanently unreachable via `/api/v1/chat` until a new key is created.

## Source reference
`app/api/workflows/[slug]/api-keys/[id]/route.ts` lines 42–48: `if (activeCount <= 1 && existing.is_active)` returns 409 `"Cannot disable the last active key for this workflow"`.
