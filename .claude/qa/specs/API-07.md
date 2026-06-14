---
id: API-07
title: OPTIONS preflight returns 204 with correct CORS headers
severity: medium
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `OPTIONS /api/v1/chat` returns HTTP 204 with no body and the three CORS headers, satisfying browser CORS preflight requirements.

## Steps

1. Send an OPTIONS preflight request:
   ```bash
   curl -si -X OPTIONS http://localhost:3000/api/v1/chat \
     -H "Origin: https://myapp.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Authorization, Content-Type"
   ```
2. Verify HTTP status **204** (No Content)
3. Verify the response body is **empty** (no JSON, no HTML)
4. Verify the CORS Methods/Headers are present:
   - `access-control-allow-methods: POST, GET, OPTIONS`
   - `access-control-allow-headers: Authorization, Content-Type`
   - `access-control-allow-origin` is present **only** when `CORS_ORIGIN` is set
     (deny-by-default — see API-06). Run with `CORS_ORIGIN=*` to see it reflected
     on the preflight, or an allowlist origin sending a matching `Origin`.
5. Verify no `Content-Type` header is added (no body to type)

## Steps — preflight does not require authentication

6. Send the OPTIONS request **without** an `Authorization` header
7. Verify it still returns 204 with CORS headers (preflight must succeed without auth to allow browsers to send the actual request)

## Expected result
- HTTP 204 No Content
- Empty response body (`null`)
- CORS Methods/Headers present; `Access-Control-Allow-Origin` only when `CORS_ORIGIN` opts in (see API-06)
- No Authorization required for OPTIONS

## Failure indicators
- OPTIONS returns 200 with a body instead of 204 with no body
- OPTIONS returns 405 Method Not Allowed
- CORS Methods/Headers absent on the OPTIONS response
- OPTIONS requires an Authorization header

## Severity rationale
Browsers send an OPTIONS preflight before every cross-origin POST; if the preflight fails, browsers never send the actual request and the entire API is blocked for browser clients.

## Source reference
`app/api/v1/chat/route.ts` — `export async function OPTIONS(request) { return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }); }` (deny-by-default; see `corsHeaders` in `lib/execution-handler.ts`).

## Notes
The OPTIONS handler returns `null` as the body and status 204 — this is the standard CORS preflight response pattern. No authentication, no DB query, no workflow lookup is performed for OPTIONS requests.
