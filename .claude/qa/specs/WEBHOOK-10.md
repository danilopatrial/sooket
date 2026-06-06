---
id: WEBHOOK-10
title: Webhook 413 (oversized body) and 503 (concurrency full)
severity: medium
source_files:
  - app/api/webhooks/[slug]/route.ts
  - lib/request-limit.ts
  - lib/concurrency.ts
---

## What this tests
Verifies the two resource-guard paths on the webhook endpoint: an oversized request body returns `413`, and a request that cannot acquire an execution slot returns `503`.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow (`<slug>`, plus token if set)
- For the 503 case, start the server with a tiny concurrency budget (as in ENGINE-07), e.g. `EXECUTION_CONCURRENCY=1 EXECUTION_MAX_QUEUE=0 npm run dev`

## Steps
1. Oversized body (default cap is 1 MiB; overridable via `SOOKET_MAX_BODY_BYTES`):
   ```bash
   head -c 1100000 /dev/zero | tr '\0' 'x' > /tmp/big.txt
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: application/json" --data-binary @/tmp/big.txt
   ```
2. Concurrency exhaustion: fire several concurrent requests against a slow workflow so the semaphore is saturated, and confirm at least one returns `503`.

## Expected result
- Step 1: HTTP `413` with `{ "error": "Request body too large" }`; the oversized body is rejected without being fully buffered/executed.
- Step 2: at least one concurrent request returns `503` with `{ "error": "Server busy, try again shortly" }`.

## Failure indicators
- An oversized body is buffered/executed instead of returning `413`.
- Saturating concurrency returns `200`/`500` instead of `503`.

## Severity rationale
These guards protect process memory and the shared execution pool; without them a single caller could exhaust either.

## Source reference
`app/api/webhooks/[slug]/route.ts` — 413 at lines 69–73 (catches `RequestBodyTooLargeError`); 503 at lines 90–93 (`executionSemaphore.acquire()` returning false). Limit logic in `lib/request-limit.ts`.

## Notes
The webhook shares `readLimitedText` (lib/request-limit.ts) and `executionSemaphore` (lib/concurrency.ts) with `/api/v1/chat`. See LIMIT-02 for the body-cap behavior in isolation.
