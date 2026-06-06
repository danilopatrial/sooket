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
4. Verify all three CORS headers are present:
   - `access-control-allow-origin: *`
   - `access-control-allow-methods: POST, GET, OPTIONS`
   - `access-control-allow-headers: Authorization, Content-Type`
5. Verify no `Content-Type` header is added (no body to type)

## Steps — preflight does not require authentication

6. Send the OPTIONS request **without** an `Authorization` header
7. Verify it still returns 204 with CORS headers (preflight must succeed without auth to allow browsers to send the actual request)

## Expected result
- HTTP 204 No Content
- Empty response body (`null`)
- All three CORS headers present
- No Authorization required for OPTIONS

## Failure indicators
- OPTIONS returns 200 with a body instead of 204 with no body
- OPTIONS returns 405 Method Not Allowed
- CORS headers absent on the OPTIONS response
- OPTIONS requires an Authorization header

## Severity rationale
Browsers send an OPTIONS preflight before every cross-origin POST; if the preflight fails, browsers never send the actual request and the entire API is blocked for browser clients.

## Source reference
`app/api/v1/chat/route.ts` lines 30-32 (`export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS_HEADERS }); }`).

## Notes
The OPTIONS handler returns `null` as the body and status 204 — this is the standard CORS preflight response pattern. No authentication, no DB query, no workflow lookup is performed for OPTIONS requests.
