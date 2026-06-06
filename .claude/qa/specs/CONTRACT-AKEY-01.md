---
id: CONTRACT-AKEY-01
title: GET api-keys returns keys with masked key_hint
severity: critical
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that GET `/api/workflows/[slug]/api-keys` returns `{"keys":[...]}` where each entry exposes `key_hint` (first 10 + "..." + last 4 chars) instead of the full key value.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below
- At least one API key has been created for that workflow

## Steps
1. Create an API key:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"test-key"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key']['key'])"
   ```
   Note the full key value (e.g. `sk-wf-abc123...`).
2. Fetch the keys list:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys
   ```
3. Confirm the full key is absent and `key_hint` is present:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys | \
     python3 -c "import sys,json; d=json.load(sys.stdin); k=d['keys'][0]; print('key' in k, 'key_hint' in k, k['key_hint'])"
   ```
4. Verify the `key_hint` format: it should start with the first 10 characters of the full key, followed by `...`, followed by the last 4 characters.

## Expected result
GET returns HTTP 200 with `{"keys":[...]}`. Each key object contains: `id`, `label`, `key_hint`, `scopes`, `rate_limit_override`, `expires_at`, `last_used_at`, `is_active`, `created_at`. The `key` field (full value) is **not** present. `key_hint` matches the pattern `<first10>...<last4>` of the full key from step 1.

## Failure indicators
- The full `key` value appears in any GET response object
- `key_hint` field is absent
- `key_hint` does not match `<first10>...<last4>` of the actual key
- Response top-level key is not `keys`

## Severity rationale
Critical: leaking full API key values in list responses is a security vulnerability; callers must never see raw keys after initial creation.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` lines 15–18 (`maskKey`): `return \`${key.slice(0, 10)}...${key.slice(-4)}\``; lines 35–47: GET response uses `key_hint: maskKey(r.key)`, never exposes `r.key`.
