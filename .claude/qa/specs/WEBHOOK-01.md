---
id: WEBHOOK-01
title: Webhook inbound POST executes active workflow
severity: critical
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that a valid POST to `/api/webhooks/[slug]` on an active workflow executes the node graph and returns `{ ok: true, output }`.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow exists with a known slug (`<slug>`) whose graph reaches an output node
- The workflow has **no** `webhook_token` set (token auth is covered separately in WEBHOOK-04/05)

## Steps
1. Send a POST with a JSON body to the inbound webhook URL:
   ```bash
   curl -s -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: application/json" \
     -d '{"message":"hello"}' | python3 -m json.tool
   ```
2. Inspect the top-level `ok` and `output` fields.
3. If the output node receives an object, confirm `output` is that object **directly** (not a JSON-encoded string).

## Expected result
- HTTP status code is `200`.
- Response body is `{ "ok": true, "output": ... }`.
- When the workflow output is an object, `output` is the object itself; when it is a primitive, `output` is its `String()` form; when null/undefined, `output` is `""`.
- CORS headers are present (see WEBHOOK-09).

## Failure indicators
- HTTP status is not 200.
- `ok` is `false` or absent on a workflow that reaches an output node.
- An object output is double-encoded (a stringified object under `output`).

## Severity rationale
The inbound webhook is a primary execution entry point alongside `/api/v1/chat`; a broken happy path makes the entire trigger feature unusable.

## Source reference
`app/api/webhooks/[slug]/route.ts` `handleWebhook` — final `return NextResponse.json({ ok: true, output }, ...)` at line 134; object-vs-primitive shaping at line 133.

## Notes
Unlike `/api/v1/chat` (which wraps the result in `{ reply }`), the webhook endpoint wraps it in `{ ok, output }`. The Webhook node's "trigger" mode surfaces this inbound URL on the canvas (see WEBHOOK-11).
