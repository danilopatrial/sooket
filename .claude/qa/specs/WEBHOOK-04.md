---
id: WEBHOOK-04
title: Webhook missing/invalid token returns 401
severity: high
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that when a workflow has a `webhook_token`, requests with a missing or incorrect token are rejected with `401` and the workflow does **not** execute.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow exists with a known slug (`<slug>`) and a configured `webhook_token`

## Steps
1. Send a POST with **no** token:
   ```bash
   curl -si -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: application/json" -d '{}'
   ```
2. Send a POST with a **wrong** token:
   ```bash
   curl -si -X POST "http://localhost:3000/api/webhooks/<slug>?token=wrong" \
     -H "Content-Type: application/json" -d '{}'
   ```

## Expected result
- Both requests return HTTP `401` with body `{ "error": "Invalid or missing webhook token" }`.
- CORS headers are present on the 401 response.
- No execution record is created for these requests.

## Failure indicators
- A missing or wrong token returns `200`/`403`/`500` instead of `401`.
- The workflow executes despite the failed token check.

## Severity rationale
The token is the only access control on the inbound webhook; a bypass would let anonymous callers run the workflow.

## Source reference
`app/api/webhooks/[slug]/route.ts` lines 46–51 — when `workflowRow.webhook_token` is set, a missing or mismatched `provided` token returns 401 before any execution.

## Notes
Workflows with **no** `webhook_token` skip the token check entirely (the inbound URL is then unauthenticated by design).
