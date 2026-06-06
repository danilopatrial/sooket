---
id: LIMIT-02
title: /api/webhooks/[slug] rejects oversized body with 413
severity: high
source_files:
  - app/api/webhooks/[slug]/route.ts
  - lib/request-limit.ts
---

## What this tests
Verifies that `POST /api/webhooks/[slug]` rejects a request body larger than the configured cap with `413 { error: "Request body too large" }` instead of buffering/executing it.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow (`<slug>`, plus token if set)
- Default cap is 1 MiB (`DEFAULT_MAX_BODY_BYTES`); overridable via `SOOKET_MAX_BODY_BYTES`

## Steps
1. Send an oversized body (include `?token=<token>` if the workflow has one):
   ```bash
   head -c 1100000 /dev/zero | tr '\0' 'x' > /tmp/big.txt
   curl -si -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: application/json" --data-binary @/tmp/big.txt | head -15
   ```

## Expected result
- HTTP status code is `413` with `{ "error": "Request body too large" }`.
- CORS headers are present.
- No execution record is created for the rejected request.

## Failure indicators
- The oversized body returns `200`/`400`/`500` instead of `413`.
- The body is executed before being rejected.

## Severity rationale
The webhook endpoint is publicly reachable (token-gated at most); an unbounded body would let a caller exhaust process memory.

## Source reference
`app/api/webhooks/[slug]/route.ts` lines 59–74 — `readLimitedText(request)` with a catch that maps `RequestBodyTooLargeError` to 413.

## Notes
On the webhook path the body is read **after** the token and active checks, so a token-protected workflow first requires a valid token before the 413 path is reachable. A non-`RequestBodyTooLargeError` read failure returns `400 { error: "Failed to read request body" }`.
