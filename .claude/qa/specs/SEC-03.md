---
id: SEC-03
title: API key values masked in list responses first 10 plus last 4 chars
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that `GET /api/workflows/[slug]/api-keys` returns only masked key values (`key_hint`) — never the full key — and that the mask format is `{first 10 chars}...{last 4 chars}`.

## Steps — list keys after creation

1. Create a key (note the full value from the one-time reveal banner):
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H "Content-Type: application/json" \
     -d '{"label": "test key"}'
   ```
   Note the `key` field in the 201 response (e.g. `sk-wf-abc123def456ghi789jkl012`)

2. List keys:
   ```bash
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys
   ```

3. Verify the response contains `key_hint` (not `key`):
   ```json
   { "keys": [{ "id": 1, "label": "test key", "key_hint": "sk-wf-abc1...0012", ... }] }
   ```

## Steps — verify mask format

4. Given key `sk-wf-abc123def456ghi789jkl012` (38 chars):
   - First 10 chars: `sk-wf-abc1`
   - Last 4 chars: `0012`
   - Expected `key_hint`: `sk-wf-abc1...0012`
5. Confirm the format is: `{slice(0,10)}...{slice(-4)}`

## Steps — short keys

6. If a key is 10 or fewer characters (edge case — `sk-wf-*` keys are always longer): `key_hint` = full key (no masking)

## Steps — full key never in list response

7. Check the GET response JSON structure — confirm no `key` field, only `key_hint`
8. The full key is only present in the POST 201 creation response once; it cannot be retrieved again via the API

## Expected result
- GET list: `key_hint` field = `key.slice(0, 10) + "..." + key.slice(-4)`
- No `key` field in GET list response
- Keys longer than 10 chars are always masked; ≤10 chars returned as-is
- Full key value only available in the POST 201 creation response

## Failure indicators
- GET response contains a `key` field with the full key value
- `key_hint` format is wrong (e.g. first 8 + last 4, or wrong separator)
- POST creation response does not include the full key

## Severity rationale
API keys grant workflow execution access; full key exposure in list responses would allow any user with list-read access to execute workflows.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` lines 15-18 (`maskKey`: `key.length <= 10 ? key : key.slice(0,10) + "..." + key.slice(-4)`), line 38 (`key_hint: maskKey(r.key)` in GET response), line 108 (`key_hint: maskKey(key)` in POST response alongside full `key`).
