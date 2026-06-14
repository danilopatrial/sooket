---
id: API-06
title: CORS is deny-by-default; Allow-Origin only when CORS_ORIGIN opts in
severity: high
source_files:
  - lib/execution-handler.ts
  - app/api/v1/chat/route.ts
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies the CORS policy for the execution + webhook APIs: by default (no `CORS_ORIGIN`) responses carry the `Access-Control-Allow-Methods`/`-Headers` but **no** `Access-Control-Allow-Origin` (browsers block cross-origin reads); setting `CORS_ORIGIN=*` allows any origin; setting it to one or more specific origins reflects a matching request `Origin` (with `Vary: Origin`) and denies the rest. The Methods/Headers appear on every response (200/4xx/5xx and ResponseBuilder); only `Access-Control-Allow-Origin` is gated.

## Prerequisites
- App is running at http://localhost:3000
- A valid `sk-wf-*` key for an active workflow
- Ability to restart the app with different `CORS_ORIGIN` values

## Steps — default deny (CORS_ORIGIN unset)
1. Start the app with `CORS_ORIGIN` unset. Send a valid request with a browser-style Origin:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" -H "Origin: https://myapp.com" \
     -H "Content-Type: application/json" -d '{"message":"test"}'
   ```
2. Verify the response has **no** `access-control-allow-origin` header, but **does** have `access-control-allow-methods: POST, GET, OPTIONS` and `access-control-allow-headers: Authorization, Content-Type`.
3. Repeat for an error response (401 with no Authorization, 403 inactive workflow, 500 throwing workflow) and confirm the same: Methods/Headers present, no ACAO.

## Steps — wildcard opt-in (CORS_ORIGIN=*)
4. Restart with `CORS_ORIGIN=*`. Repeat step 1. Verify `access-control-allow-origin: *` is present on success and on error responses.

## Steps — allowlist opt-in (specific origins)
5. Restart with `CORS_ORIGIN=https://myapp.com` (a comma-separated list is also accepted, e.g. `https://a.com,https://b.com`).
6. Send with `-H "Origin: https://myapp.com"` → verify `access-control-allow-origin: https://myapp.com` and `vary: Origin`.
7. Send with `-H "Origin: https://evil.com"` → verify **no** `access-control-allow-origin` (denied) but `vary: Origin` still present.
8. Send with no `Origin` header → no ACAO.

## Steps — webhook + preflight parity
9. Confirm the webhook endpoint (`/api/webhooks/<slug>`) and the `OPTIONS` preflight (`/api/v1/chat`, `/api/webhooks/<slug>`) follow the same policy: deny by default, reflect/allow per `CORS_ORIGIN`.

## Expected result
- Default (unset): no `Access-Control-Allow-Origin` on any response; Methods/Headers always present.
- `CORS_ORIGIN=*`: `Access-Control-Allow-Origin: *` on every response (success, 4xx, 5xx, ResponseBuilder, OPTIONS).
- `CORS_ORIGIN` = origin(s): a matching `Origin` is reflected back with `Vary: Origin`; non-matching/absent origins get no ACAO.
- ResponseBuilder (`__rb: true`) responses follow the same policy (they spread the resolved CORS headers before user headers).

## Failure indicators
- A wildcard `Access-Control-Allow-Origin: *` appears when `CORS_ORIGIN` is unset (the regression this guards against — open CORS by default).
- An allowlist origin that does not match is still reflected/allowed.
- Methods/Headers missing from responses, breaking preflight even when an origin is configured.
- The webhook route or OPTIONS preflight disagrees with the execution API on the policy.

## Severity rationale
A wildcard CORS default on an execution API invites browser-side use of a workflow key from any origin; defaulting to deny and requiring explicit opt-in is the safer posture. High because it is a security-relevant default on the primary live endpoint.

## Source reference
`lib/execution-handler.ts` — `corsMode()` parses `CORS_ORIGIN` (unset/empty → deny, `*` → wildcard, else comma-list allowlist); `corsHeaders(requestOrigin)` adds `Access-Control-Allow-Origin` only for wildcard or a matching allowlist origin (reflected, with `Vary: Origin`); `handleExecutionRequest` resolves it once from `req.headers.get("origin")`. `app/api/v1/chat/route.ts` and `app/api/webhooks/[slug]/route.ts` call `corsHeaders(request.headers.get("origin"))` for OPTIONS and their own pre-handler/error responses.

## Notes
CORS only governs browser cross-origin reads — non-browser callers (server-to-server with a Bearer key) are unaffected regardless of this setting. Code-level coverage: `__tests__/lib/cors.test.ts` (deny/wildcard/allowlist/reflection/Vary) and the route/handler tests in `__tests__/api/`.
