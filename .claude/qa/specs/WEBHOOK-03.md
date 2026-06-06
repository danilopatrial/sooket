---
id: WEBHOOK-03
title: Webhook token accepted via ?token= query param
severity: high
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that when a workflow has a `webhook_token`, a request supplying the correct token via the `?token=` query param (and no header) is authorized and executes.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow exists with a known slug (`<slug>`) and a configured `webhook_token` (`<token>`)

## Steps
1. Send a POST with the token in the query string and no `x-webhook-secret` header:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     "http://localhost:3000/api/webhooks/<slug>?token=<token>" \
     -H "Content-Type: application/json" \
     -d '{"message":"hi"}'
   ```

## Expected result
- HTTP status code is `200` and the workflow executes.

## Failure indicators
- A correct query-param token is rejected with `401`.

## Severity rationale
Query-param tokens let webhook providers that cannot set custom headers still authenticate; losing this path blocks those integrations.

## Source reference
`app/api/webhooks/[slug]/route.ts` `extractToken` — falls back to `url.searchParams.get("token")` (line 30) when no header is present.

## Notes
If both a header and a query param are present, the header wins (see WEBHOOK-02).
