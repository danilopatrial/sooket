---
id: API-06
title: CORS headers present on all responses
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that every response from `POST /api/v1/chat` — including success, error, and ResponseBuilder responses — includes the three required CORS headers.

## Steps — CORS on success response

1. Send a valid request:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}'
   ```
2. Inspect response headers; verify all three CORS headers are present:
   - `access-control-allow-origin: *`
   - `access-control-allow-methods: POST, GET, OPTIONS`
   - `access-control-allow-headers: Authorization, Content-Type`

## Steps — CORS on 401 (missing/invalid key)

3. Send with no Authorization header:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Content-Type: application/json" -d '{}'
   ```
4. Verify 401 response still includes all three CORS headers

## Steps — CORS on 403 (inactive workflow)

5. Send with a valid key for an inactive workflow
6. Verify 403 response includes all three CORS headers

## Steps — CORS on 503 (server busy)

7. Trigger a 503 (with `EXECUTION_CONCURRENCY=1 EXECUTION_MAX_QUEUE=0` as in ENGINE-07)
8. Verify 503 response includes CORS headers

## Steps — CORS on 500 (workflow execution error)

9. Configure a workflow that always throws; send a valid request
10. Verify 500 response includes CORS headers

## Steps — CORS with custom CORS_ORIGIN

11. Restart the app with `CORS_ORIGIN=https://myapp.com`
12. Send any request — verify `access-control-allow-origin: https://myapp.com` (not `*`)

## Expected result
- All responses from `POST /api/v1/chat` include:
  - `Access-Control-Allow-Origin: *` (or `CORS_ORIGIN` env value)
  - `Access-Control-Allow-Methods: POST, GET, OPTIONS`
  - `Access-Control-Allow-Headers: Authorization, Content-Type`
- These headers are present on 200, 400, 401, 403, 500, 503 responses
- ResponseBuilder (`__rb: true`) responses also include CORS headers (they use `{ ...CORS_HEADERS, ...userHeaders }`)

## Failure indicators
- Any non-OPTIONS response missing one or more CORS headers
- `Access-Control-Allow-Origin` absent on error responses (browsers can't read error bodies without it)
- ResponseBuilder response missing CORS headers

## Severity rationale
Missing CORS headers on error responses prevent browser clients from reading error messages; missing them entirely would block all cross-origin API usage.

## Source reference
`app/api/v1/chat/route.ts` lines 15-19 (`CORS_HEADERS` object with three headers), lines 21-26 (`corsJson` helper — always includes `CORS_HEADERS`), lines 167-174 (ResponseBuilder response: `{ ...CORS_HEADERS, ...userHeaders }`).

## Notes
`corsJson` is used for all error and success responses except the ResponseBuilder path. The `CORS_ORIGIN` env variable controls the `Access-Control-Allow-Origin` value; it defaults to `"*"` (line 13).
