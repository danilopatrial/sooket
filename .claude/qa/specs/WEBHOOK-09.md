---
id: WEBHOOK-09
title: ResponseBuilder honored on webhook responses
severity: medium
source_files:
  - app/api/webhooks/[slug]/route.ts
  - lib/nodes/response-builder.ts
---

## What this tests
Verifies that when a workflow's active output is a Response Builder result (`__rb`), the webhook endpoint returns the custom status code, custom headers, and raw body — instead of the default `{ ok, output }` envelope.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow (`<slug>`, plus token if set) whose output is a Response Builder node configured with status `201`, a header `X-Custom: yes`, and a JSON body `{"made":"by-rb"}`

## Steps
1. Call the webhook and inspect status + headers + body:
   ```bash
   curl -si -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: application/json" -d '{}'
   ```

## Expected result
- HTTP status code is `201` (the Response Builder status, not 200).
- The `X-Custom: yes` header is present.
- The body is the Response Builder body verbatim (`{"made":"by-rb"}`), **not** wrapped in `{ ok, output }`.
- CORS headers are still present.

## Failure indicators
- The response is wrapped in `{ ok, output }` instead of using the custom status/body.
- The custom status code or custom header is dropped.

## Severity rationale
Response Builder is the documented way to shape webhook responses (e.g. returning a provider-required ack); ignoring it breaks those integrations.

## Source reference
`app/api/webhooks/[slug]/route.ts` lines 120–131 — detects `rv.__rb === true` and builds a `Response` with `rb.status`, merged `rb.headers`, and `rb.body`.

## Notes
String Response Builder bodies are sent as-is; non-string bodies are `JSON.stringify`-ed. Content-Type defaults to `application/json` unless overridden by an `rb.headers` entry.
