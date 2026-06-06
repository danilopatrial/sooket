---
id: CONTRACT-AKEY-02
title: POST api-keys returns 201 with full key value
severity: critical
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that POST `/api/workflows/[slug]/api-keys` with a valid `label` returns HTTP 201 and includes the full plaintext key value in the response (the only time it is ever exposed).

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Create a new API key:
   ```
   curl -s -o /tmp/akey02.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"my-key"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/akey02.json`
3. Verify the response shape:
   ```
   cat /tmp/akey02.json | python3 -c "
   import sys, json
   d = json.load(sys.stdin)
   k = d['key']
   print('id:', k['id'])
   print('label:', k['label'])
   print('key:', k['key'])
   print('key_hint:', k['key_hint'])
   print('scopes:', k['scopes'])
   print('is_active:', k['is_active'])
   "
   ```
4. Verify the `key` starts with `sk-wf-` and that `key_hint` equals `key[:10] + '...' + key[-4:]`:
   ```
   cat /tmp/akey02.json | python3 -c "
   import sys, json
   k = json.load(sys.stdin)['key']
   full = k['key']
   hint = k['key_hint']
   print('prefix ok:', full.startswith('sk-wf-'))
   print('hint ok:', hint == full[:10] + '...' + full[-4:])
   "
   ```

## Expected result
HTTP `201`. Response body is `{"key":{...}}` with fields: `id` (integer), `label` ("my-key"), `key` (full value starting with `sk-wf-`), `key_hint` (masked), `scopes` (`["execute"]`), `rate_limit_override` (null), `expires_at` (null), `last_used_at` (null), `is_active` (true), `created_at`. Both `key.startswith('sk-wf-')` and the hint check in step 4 print `True`.

## Failure indicators
- HTTP status other than 201
- `key` field absent from response (full value not returned at creation time)
- `key` does not start with `sk-wf-`
- `is_active` is not `true`
- `scopes` is not `["execute"]` when no `scopes` param was sent
- `key_hint` does not match the masked form of `key`

## Severity rationale
Critical: the full key is only returned once at creation — if it is absent from the 201 response the caller can never retrieve it.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` line 86: `const key = \`sk-wf-${crypto.randomUUID().replace(/-/g, "")}\``; lines 103–116: POST response includes `key` (full value) and `key_hint` (masked), status 201.
