---
id: API-02
title: Invalid or missing API key returns 401
severity: critical
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `POST /api/v1/chat` returns 401 for requests with a missing Authorization header, no Bearer token, or an API key that is not found in the database or belongs to a disabled key.

## Steps — missing Authorization header

1. Send a POST request with no Authorization header:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```
2. Verify HTTP status **401** and body `{ "error": "Missing Authorization header" }`

## Steps — Authorization header without Bearer prefix

3. Send with a raw token (no `Bearer ` prefix):
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: sk-wf-some-key" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
4. Verify HTTP status **401** and body `{ "error": "Missing Authorization header" }` (token extraction requires `Bearer ` prefix)

## Steps — unrecognized API key

5. Send with a well-formed but non-existent key:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-00000000-0000-0000-0000-000000000000" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
6. Verify HTTP status **401** and body `{ "error": "Invalid API key" }`

## Steps — disabled API key

7. Disable an existing API key via the Config → API Keys tab (toggle off)
8. Send a request using that key
9. Verify HTTP status **401** and body `{ "error": "Invalid API key" }` (disabled keys are excluded by `WHERE k.is_active = 1` in the query — same response as not found)

## Steps — CORS headers on 401

10. Verify the CORS Methods/Headers are present on the 401 response:
    - `Access-Control-Allow-Methods: POST, GET, OPTIONS`
    - `Access-Control-Allow-Origin` only when `CORS_ORIGIN` is set (deny-by-default — see API-06)

## Expected result
- No `Authorization` header: 401 `{ "error": "Missing Authorization header" }`
- `Authorization` present but not `Bearer <token>`: 401 `{ "error": "Missing Authorization header" }`
- Key not in DB: 401 `{ "error": "Invalid API key" }`
- Key in DB but `is_active = 0`: 401 `{ "error": "Invalid API key" }` (filtered by query)
- All 401 responses include CORS headers

## Failure indicators
- Missing token returns 400 or 403 instead of 401
- Non-existent key returns 403 or 404 instead of 401
- Disabled key is accepted and the workflow executes
- 401 response missing CORS headers

## Severity rationale
Authentication failures must return 401 (not 403 or 400) for correct HTTP semantics; missing CORS headers would break browser-based callers from reading the error.

## Source reference
`app/api/v1/chat/route.ts` lines 40-42 (token extraction: `Bearer ` prefix required, else `null`; returns 401 if `!token`), lines 46-59 (DB lookup `WHERE k.key = ? AND k.is_active = 1`; returns 401 `"Invalid API key"` if no row found).
