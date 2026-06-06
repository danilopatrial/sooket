---
id: WEBHOOK-05
title: Token check precedes active check (no state leak)
severity: medium
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that token verification runs **before** the `is_active` check, so an unauthenticated caller cannot distinguish an active workflow from an inactive one (both return `401`, not `403`).

## Prerequisites
- App is running at http://localhost:3000
- An **inactive** workflow exists with a known slug (`<slug>`) and a configured `webhook_token`

## Steps
1. Send a POST with no token to the inactive, token-protected workflow:
   ```bash
   curl -si -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: application/json" -d '{}'
   ```

## Expected result
- HTTP status code is `401` with `{ "error": "Invalid or missing webhook token" }` — **not** `403`.
- The response does not reveal whether the workflow is active.

## Failure indicators
- An inactive token-protected workflow returns `403` to a tokenless caller (leaking active/inactive state before authenticating).

## Severity rationale
Returning 403 before authentication leaks workflow state to anonymous callers; ordering the checks correctly is a small but real information-disclosure guard.

## Source reference
`app/api/webhooks/[slug]/route.ts` — the token block (lines 46–51) runs before the `if (!workflowRow.is_active)` block (lines 53–55). Comment at line 45 documents the intent.

## Notes
For a workflow with a valid token but inactive state, supplying the correct token then yields `403 { error: "Workflow is not active" }` (see WEBHOOK-06).
