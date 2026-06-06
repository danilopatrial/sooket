---
id: WEBHOOK-08
title: Webhook supports POST/GET/PUT/PATCH; OPTIONS preflight returns 204
severity: medium
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that the inbound webhook executes the workflow for all of POST, GET, PUT, and PATCH, and that an OPTIONS preflight returns `204` with CORS headers (and that the HTTP method is exposed to the workflow as the `method` input-node handle).

## Prerequisites
- App is running at http://localhost:3000
- An active workflow (`<slug>`, plus token if set) reaching an output node

## Steps
1. For each method, confirm the workflow executes:
   ```bash
   for m in POST GET PUT PATCH; do
     echo -n "$m -> "
     curl -s -o /dev/null -w "%{http_code}\n" -X $m \
       http://localhost:3000/api/webhooks/<slug> \
       -H "Content-Type: application/json" -d '{}'
   done
   ```
2. Send an OPTIONS preflight:
   ```bash
   curl -si -X OPTIONS http://localhost:3000/api/webhooks/<slug>
   ```

## Expected result
- POST, GET, PUT, PATCH each return `200` and execute the workflow.
- OPTIONS returns `204` with an empty body and CORS headers.
- The request method is available to the graph via the input node's `method` handle (per NODE-INPUT-04).

## Failure indicators
- Any of POST/GET/PUT/PATCH returns `405`/`500`.
- OPTIONS returns a status other than `204`, or omits CORS headers.
- A `DELETE` request unexpectedly executes the workflow (DELETE is intentionally not handled).

## Severity rationale
Webhook providers use varied HTTP verbs; failing to accept the documented set would silently drop deliveries.

## Source reference
`app/api/webhooks/[slug]/route.ts` — `OPTIONS` (lines 137–139), `POST`/`GET`/`PUT`/`PATCH` exports (lines 141–159) all delegate to `handleWebhook`. No `DELETE` export exists.

## Notes
All four execution methods share the same handler, so the method only matters where the graph reads it (e.g. an input `method` handle or a Router keyed on method).
