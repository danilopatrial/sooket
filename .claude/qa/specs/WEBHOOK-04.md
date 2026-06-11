---
id: WEBHOOK-04
title: Webhook missing/invalid token returns 401
severity: high
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that when a workflow has a `webhook_token`, requests with a missing or incorrect token are rejected with `401` and the workflow does **not** execute — and that the token is compared in **constant time** (`safeEqual`), so it cannot be recovered byte-by-byte via response-timing and an equal-length wrong token is still rejected.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow exists with a known slug (`<slug>`) and a configured `webhook_token` (use a known value, e.g. `abcd1234`)

## Steps
1. Send a POST with **no** token:
   ```bash
   curl -si -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: application/json" -d '{}'
   ```
2. Send a POST with a **wrong** token (different length):
   ```bash
   curl -si -X POST "http://localhost:3000/api/webhooks/<slug>?token=wrong" \
     -H "Content-Type: application/json" -d '{}'
   ```
3. Send a POST with a wrong token of the **same length** as the real one (e.g. real `abcd1234`, sent `abcd9999`):
   ```bash
   curl -si -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "x-webhook-secret: abcd9999" -H "Content-Type: application/json" -d '{}'
   ```
4. Send a POST with the **correct** token and confirm it is accepted:
   ```bash
   curl -si -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "x-webhook-secret: abcd1234" -H "Content-Type: application/json" -d '{}'
   ```

## Expected result
- Steps 1–3 return HTTP `401` with body `{ "error": "Invalid or missing webhook token" }`; the equal-length wrong token (step 3) is rejected by value, not by a length shortcut.
- Step 4 returns `200` (or the workflow's own ResponseBuilder status) — the correct token passes the constant-time compare.
- CORS headers are present on the 401 response.
- No execution record is created for the rejected requests.

## Failure indicators
- A missing or wrong token returns `200`/`403`/`500` instead of `401`.
- The workflow executes despite the failed token check.
- The comparison uses `!==`/`===` (data-dependent early exit) instead of `safeEqual`, leaking timing about how many leading bytes matched.

## Severity rationale
The token is the only access control on the inbound webhook; a bypass — including a timing side-channel that recovers the token byte-by-byte — would let anonymous callers run the workflow.

## Source reference
`app/api/webhooks/[slug]/route.ts` — when `workflowRow.webhook_token` is set, the route returns 401 unless `safeEqual(provided, workflowRow.webhook_token)` is true (constant-time compare from `lib/security/auth.ts`), before any execution. This matches how the management surface (`isAuthorized`/`/api/admin/backup`) compares secrets.

## Notes
Workflows with **no** `webhook_token` skip the token check entirely (the inbound URL is then unauthenticated by design). `safeEqual` returns false on any length mismatch (the length difference is not itself the secret) and otherwise compares with `timingSafeEqual`. Unit coverage is in `__tests__/api/webhooks.test.ts` (wrong/correct same-length token cases).
