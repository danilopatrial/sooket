---
id: WEBHOOK-06
title: Webhook 404 (unknown slug) and 403 (inactive workflow)
severity: high
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies the two non-execution status paths: an unknown slug returns `404`, and an existing-but-inactive workflow (after passing any token check) returns `403`.

## Prerequisites
- App is running at http://localhost:3000
- A known **inactive** workflow slug (`<inactive-slug>`); if it has a `webhook_token`, supply it
- A slug that does not exist (`does-not-exist`)

## Steps
1. Unknown slug:
   ```bash
   curl -si -X POST http://localhost:3000/api/webhooks/does-not-exist \
     -H "Content-Type: application/json" -d '{}'
   ```
2. Inactive workflow (include `?token=<token>` if it has one):
   ```bash
   curl -si -X POST http://localhost:3000/api/webhooks/<inactive-slug> \
     -H "Content-Type: application/json" -d '{}'
   ```

## Expected result
- Step 1: HTTP `404` with `{ "error": "Workflow not found" }`.
- Step 2: HTTP `403` with `{ "error": "Workflow is not active" }`.
- CORS headers present on both responses.

## Failure indicators
- Unknown slug returns `200`/`500` instead of `404`.
- Inactive workflow returns `200` (executes) or `500` instead of `403`.

## Severity rationale
Executing an inactive workflow, or 500-ing on an unknown slug, would be incorrect and confusing behavior for an integration endpoint.

## Source reference
`app/api/webhooks/[slug]/route.ts` — 404 at lines 41–43; 403 at lines 53–55.

## Notes
The 404 is returned before the token check; the 403 is returned only after a token check (if any) passes.
