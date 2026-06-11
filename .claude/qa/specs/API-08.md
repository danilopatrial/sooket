---
id: API-08
title: Rate limit exceeded returns 429
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `POST /api/v1/chat` returns 429 when a per-key rate limit override is configured and exceeded within a **sliding** 1-minute window. The per-key limiter shares `consumeSlidingWindow` (`lib/rate-limit.ts`) with the Rate Limiter node, so a burst straddling a minute boundary does not pass ~2× the limit.

## Steps — configure a rate limit override

1. Navigate to Config → API Keys tab; open the stats/edit panel for a key
2. Set a **Rate Limit Override** of `2` requests per minute on that key
3. Note: rate limiting only applies when `rate_limit_override` is set on the key row; keys without an override have no per-key rate limit

## Steps — trigger the rate limit

4. Send 2 requests within 1 minute using that key — both should succeed (200)
5. Send a 3rd request within the same minute:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<rate-limited-key>" \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}'
   ```
6. Verify HTTP status **429** and body `{ "error": "Rate limit exceeded for this API key" }`

## Steps — window reset

7. Wait for the current minute window to pass (at most 60 seconds)
8. Send another request — verify it succeeds (counter resets with each new minute window)

## Steps — keys without a rate limit override

9. Use a key that has no `rate_limit_override` configured
10. Send many requests in quick succession — no 429 is returned (global rate limiting only via Rate Limiter node, not per-key)

## Steps — CORS on 429

11. Verify the 429 response includes all three CORS headers

## Expected result
- Key with `rate_limit_override = N`: returns 429 once the sliding-window estimate reaches N within ~1 minute
- 429 body: `{ "error": "Rate limit exceeded for this API key" }`
- Key without `rate_limit_override` (null): no per-key rate limiting
- Window is a sliding 1-minute window: the previous minute's count is weighted by its remaining overlap, so the boundary is smoothed (no 2× burst)
- Rate counter incremented with `ON CONFLICT DO UPDATE SET count = count + 1` (atomic upsert); blocked requests do not increment
- CORS headers present on 429

## Failure indicators
- 429 returned for keys without a `rate_limit_override`
- Requests succeed after the limit is reached (rate limit not enforced)
- Counter does not reset after the minute window changes
- 429 missing CORS headers

## Severity rationale
Per-key rate limiting is a billing and abuse-prevention mechanism; a broken limit allows unlimited traffic against expensive downstream APIs.

## Source reference
`lib/execution-handler.ts` — `if (keyRow.rate_limit_override != null)` builds a `RateLimitStore` over `rate_limit_counters` and calls `consumeSlidingWindow(store, "apik:" + key_id, Date.now(), 60_000, rate_limit_override)`; a `!decision.allowed` result returns `{ error: "Rate limit exceeded for this API key" }` with status 429. `lib/rate-limit.ts` holds the shared algorithm.

## Notes
The window key is `apik:{key_id}`; counts are stored per ms-aligned sub-window (`floor(now/60000)*60000`) in the `rate_limit_counters` SQLite table, and the decision weights the previous sub-window. The same `consumeSlidingWindow` backs the Rate Limiter node (NODE-LOGIC-10), so both enforcement points share semantics. The read-decide-increment runs as synchronous SQLite calls, so it is atomic for this single-threaded process.
