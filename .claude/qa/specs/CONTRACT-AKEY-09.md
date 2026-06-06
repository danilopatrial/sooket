---
id: CONTRACT-AKEY-09
title: PATCH api-key updates label
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/[id]/route.ts
---

## What this tests
Verifies that PATCH `/api/workflows/[slug]/api-keys/[id]` with a `label` field updates the key's label and returns HTTP 200 with the updated key object (without the full key value).

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below
- An API key exists; note its integer `id`

## Steps
1. Create a key to patch:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"original-label"}' \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key']['id'])"
   ```
   Note the `id`.
2. Patch the label:
   ```
   curl -s -o /tmp/akey09.json -w "%{http_code}" \
     -X PATCH http://localhost:3000/api/workflows/<slug>/api-keys/<id> \
     -H 'Content-Type: application/json' \
     -d '{"label":"updated-label"}'
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/akey09.json`
4. Confirm the response shape:
   ```
   cat /tmp/akey09.json | python3 -c "
   import sys, json
   k = json.load(sys.stdin)['key']
   print('label:', k['label'])
   print('has key field:', 'key' in k)
   print('fields:', sorted(k.keys()))
   "
   ```

## Expected result
HTTP `200`. Response body is `{"key":{...}}` with fields `id`, `label`, `scopes`, `rate_limit_override`, `expires_at`, `last_used_at`, `is_active`, `created_at`. `key.label` is `"updated-label"`. The full key value (`key` field from POST) is **not** present in the PATCH response.

## Failure indicators
- HTTP status other than 200
- `key.label` is not `"updated-label"`
- Full plaintext key value appears in the response
- PATCH with an empty string label does not return 400

## Severity rationale
High: label is the primary identifier for key management; a broken PATCH prevents renaming keys.

## Source reference
`app/api/workflows/[slug]/api-keys/[id]/route.ts` lines 33–36: label trimmed and sliced to 100; lines 59–64: UPDATE statement; lines 70–90: response includes all fields except raw `key` value.
