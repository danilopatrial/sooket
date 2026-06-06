---
id: API-03
title: Expired API key returns 401
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `POST /api/v1/chat` returns 401 with `{ "error": "API key has expired" }` when the API key's `expires_at` timestamp is in the past.

## Steps — create an expired key

1. Via the Config → API Keys tab, create a new API key with an expiry date set to yesterday (or any date in the past)
2. Note the key value (visible once in the reveal banner)

## Steps — sending a request with an expired key

3. Send a POST request using the expired key:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<expired-key>" \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```
4. Verify HTTP status **401** and body `{ "error": "API key has expired" }`

## Steps — verify non-expired key is not affected

5. Create a second key with an expiry date in the future (or no expiry)
6. Send a request with that key — verify it succeeds with 200 (key is valid and not expired)

## Steps — expiry boundary

7. Note that the expiry check is `new Date(keyRow.expires_at) <= new Date()` — a key whose `expires_at` equals the current second is already expired (≤, not <)
8. A key with `expires_at = null` is never expired (null check: `if (keyRow.expires_at && ...)`)

## Steps — CORS headers on 401

9. Verify the 401 response includes CORS headers (`Access-Control-Allow-Origin: *`)

## Expected result
- Key with `expires_at` in the past: 401 `{ "error": "API key has expired" }`
- Key with `expires_at = null` (no expiry): not expired, treated as valid
- Key with `expires_at` in the future: not expired, treated as valid
- Expiry check uses `<= new Date()` (inclusive boundary — exact-second match is expired)
- 401 response includes CORS headers

## Failure indicators
- Expired key returns 200 (workflow executes despite expiry)
- Expired key returns `"Invalid API key"` instead of `"API key has expired"` (wrong error message)
- Key with `expires_at = null` is rejected as expired
- 401 missing CORS headers

## Severity rationale
Expired keys must be rejected to enforce time-bound access control; the distinct error message helps API consumers distinguish between wrong keys and expired keys.

## Source reference
`app/api/v1/chat/route.ts` lines 61-63 (`if (keyRow.expires_at && new Date(keyRow.expires_at) <= new Date()) return corsJson({ error: "API key has expired" }, 401)`).

## Notes
The expiry check runs after the DB lookup — a key must first be found and active (`is_active = 1`) before reaching the expiry check. A disabled-and-expired key returns `"Invalid API key"` (filtered out by the query) rather than `"API key has expired"`.
