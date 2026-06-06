---
id: WEBHOOK-02
title: Webhook token accepted via x-webhook-secret header
severity: high
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that when a workflow has a `webhook_token`, a request supplying the correct token in the `x-webhook-secret` header is authorized and executes.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow exists with a known slug (`<slug>`) and a configured `webhook_token` (`<token>`)

## Steps
1. Send a POST with the token in the header:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     http://localhost:3000/api/webhooks/<slug> \
     -H "x-webhook-secret: <token>" \
     -H "Content-Type: application/json" \
     -d '{"message":"hi"}'
   ```

## Expected result
- HTTP status code is `200` and the workflow executes (`{ ok: true, output }`).

## Failure indicators
- A correct header token is rejected with `401`.
- The header token is ignored and only the query param works.

## Severity rationale
Header-based token auth is the documented primary mechanism; if it fails, authenticated webhook callers cannot reach the workflow.

## Source reference
`app/api/webhooks/[slug]/route.ts` `extractToken` — reads `x-webhook-secret` first (line 27), falling back to the `token` query param.

## Notes
`extractToken` prefers the header over the query param. The token comparison is exact-match (`provided !== workflowRow.webhook_token`).
