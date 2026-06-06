---
id: CONTRACT-AKEY-10
title: PATCH api-key with is_active false disables it
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/[id]/route.ts
---

## What this tests
Verifies that PATCH with `is_active: false` sets the key's active state to false and returns HTTP 200 with `is_active: false` in the response.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below
- At least two active API keys exist for the workflow (so disabling one does not trigger the last-active-key guard)

## Steps
1. Create two keys if needed:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"key-a"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['key']['id'])"
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"key-b"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['key']['id'])"
   ```
   Note both IDs. Use one for disabling.
2. Disable the first key:
   ```
   curl -s -o /tmp/akey10.json -w "%{http_code}" \
     -X PATCH http://localhost:3000/api/workflows/<slug>/api-keys/<id-a> \
     -H 'Content-Type: application/json' \
     -d '{"is_active":false}'
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/akey10.json`
4. Confirm `is_active` is false:
   ```
   cat /tmp/akey10.json | python3 -c "import sys,json; print(json.load(sys.stdin)['key']['is_active'])"
   ```

## Expected result
HTTP `200`. `key.is_active` in the response is `false`. Subsequent GET of the keys list shows the key with `is_active: false`.

## Failure indicators
- HTTP status other than 200
- `key.is_active` is still `true` after the PATCH
- The key does not appear as inactive in subsequent GET

## Severity rationale
High: disabling a key is the primary revocation mechanism; a broken PATCH means compromised keys cannot be deactivated without deleting them.

## Source reference
`app/api/workflows/[slug]/api-keys/[id]/route.ts` lines 39–51: `nextActive = !!body.is_active`; last-active guard checked before setting; `newIsActive = 0` stored; line 87: `is_active: !!updated.is_active` returned as boolean.
