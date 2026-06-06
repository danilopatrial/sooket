---
id: SEC-04
title: New API key full value shown only once in creation response
severity: critical
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that the full API key value is included exactly once — in the POST 201 creation response — and cannot be retrieved again through any subsequent API call.

## Steps — create a key and capture the full value

1. Create an API key:
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H "Content-Type: application/json" \
     -d '{"label": "my key"}'
   ```
2. Verify the 201 response includes a `key.key` field with the full value:
   ```json
   {
     "key": {
       "id": 1,
       "label": "my key",
       "key": "sk-wf-abc123...",
       "key_hint": "sk-wf-abc1...3456",
       ...
     }
   }
   ```
3. Record the full `key` value — this is the only time it is available via the API

## Steps — full key not retrievable after creation

4. Immediately list keys:
   ```bash
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys
   ```
5. Verify the list response does NOT contain a `key` field — only `key_hint`:
   ```json
   { "keys": [{ "key_hint": "sk-wf-abc1...3456", ... }] }
   ```
6. Repeat the GET — still no `key` field in any list entry

## Steps — no separate "reveal" endpoint

7. Verify there is no `GET /api/workflows/<slug>/api-keys/<id>/reveal` or similar endpoint — the full key cannot be retrieved after the initial creation response

## Steps — UI one-time banner (functional)

8. Via the browser UI, create a key through Config → API Keys tab
9. Verify a **reveal banner** appears immediately with copy/show buttons
10. Navigate away and return to the API Keys tab — the banner is gone; only `key_hint` is shown

## Expected result
- POST 201: response includes `key.key` (full value) AND `key.key_hint` (masked)
- GET list: only `key_hint`, never `key` (full value)
- No endpoint allows re-retrieval of a full key value after creation
- The full key is the only secret that is never stored in plaintext (it's in the DB as-is for auth comparison), but it's only exposed once via the API

## Failure indicators
- GET list includes a `key` field with the full value
- POST response does not include the `key` field (key cannot be recorded by the user)
- A second POST to the same key ID somehow reveals the value again

## Severity rationale
API keys are equivalent to passwords; exposing them in list responses would allow anyone who can read the list to impersonate API callers.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` lines 103-116 (POST 201: includes full `key` field alongside `key_hint`), lines 35-47 (GET: only `key_hint: maskKey(r.key)`, no `key` field).
