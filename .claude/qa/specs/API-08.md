---
id: API-08
title: Rate limit exceeded returns 429
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `POST /api/v1/chat` returns 429 when a per-key rate limit override is configured and exceeded within a fixed 1-minute window (`Math.floor(Date.now() / 60_000)` — a tumbling bucket that resets at each minute boundary, not a sliding window).

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
- Key with `rate_limit_override = N`: returns 429 after N requests in the same 1-minute window
- 429 body: `{ "error": "Rate limit exceeded for this API key" }`
- Key without `rate_limit_override` (null): no per-key rate limiting
- Window is 1 calendar minute (floor of `Date.now() / 60_000`), not a rolling 60-second window
- Rate counter incremented with `ON CONFLICT DO UPDATE SET count = count + 1` (atomic upsert)
- CORS headers present on 429

## Failure indicators
- 429 returned for keys without a `rate_limit_override`
- Requests succeed after the limit is reached (rate limit not enforced)
- Counter does not reset after the minute window changes
- 429 missing CORS headers

## Severity rationale
Per-key rate limiting is a billing and abuse-prevention mechanism; a broken limit allows unlimited traffic against expensive downstream APIs.

## Source reference
`app/api/v1/chat/route.ts` lines 73-87 (rate limit check: `if (keyRow.rate_limit_override != null)`, 1-minute window via `Math.floor(Date.now() / 60_000)`, `if (current >= keyRow.rate_limit_override) return corsJson({ error: "Rate limit exceeded for this API key" }, 429)`).

## Notes
The window key is `apik:{key_id}` + `window_start` (floor minute). This is a tumbling 1-minute window — it resets at the start of each calendar minute, not 60 seconds after the first request. The counter is persisted in the `rate_limit_counters` SQLite table.
