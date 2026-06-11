---
id: NODE-LOGIC-10b
title: Rate Limiter uses a sliding window — no 2x boundary burst
severity: high
source_files:
  - lib/rate-limit.ts
  - lib/nodes/rate-limiter.ts
  - lib/execution-handler.ts
---

## What this tests
Verifies that rate limiting uses a **sliding-window counter**, not a tumbling fixed window: a burst that fills the limit at the very end of one window and immediately bursts again at the start of the next is blocked, rather than passing up to 2× the limit across the boundary. The same `consumeSlidingWindow` algorithm is used by both the Rate Limiter node and the per-API-key limiter.

## Prerequisites
- App is running at http://localhost:3000
- A workflow whose pipeline contains a Rate Limiter node configured with **Workflow (global)** key source, a small window (e.g. 10s), and a small limit (e.g. 5), action **Block**
- The Debug panel (or a script) able to send bursts of requests with controlled timing

## Steps — boundary burst is blocked
1. Wait until just before a window boundary (e.g. ~1s before the 10s window rolls over). Send 5 requests rapidly so the limit is reached within the closing window — all 5 pass on `output`.
2. Immediately after the window rolls over (within the first moment of the new window), send another burst of 5 requests.
3. Observe: the new burst is **blocked** (not allowed through as a fresh full quota). Under the old tumbling window all 5 would have passed, giving ~10 in a ~2s span against a limit of 5.

## Steps — capacity recovers as the previous window decays
4. Wait until roughly halfway through the new window (~5s in for a 10s window). Send requests one at a time.
5. Observe: a portion of the quota is available again (the previous window's weight has decayed by ~half), so some requests pass before blocking resumes — capacity is restored gradually, not all-at-once at the boundary.

## Steps — per-key limiter shares the behavior
6. Configure an API key with `rate_limit_override = 5`. Repeat the boundary burst (5 at end of a minute, 5 at the start of the next) against `POST /api/v1/chat`.
7. Observe: the second burst is throttled with 429 well before another full 5 are allowed — the per-key limiter is also sliding.

## Expected result
- The boundary burst is blocked: the effective rate stays at ~`limit` per window across a boundary, not ~2×.
- Capacity returns gradually through the new window (proportional to how much of the previous window has aged out), not as an instant reset.
- Both the Rate Limiter node and the per-key limiter exhibit this (shared `consumeSlidingWindow`).
- Blocked requests do not increment the counter.

## Failure indicators
- Sending `limit` at the end of a window and `limit` again at the start of the next lets ~2× the limit through (regressed to a tumbling/fixed window).
- The counter resets to zero instantly at the window boundary (no weighting of the previous window).
- The node and the per-key limiter disagree (only one is sliding).

## Severity rationale
The 2× boundary burst is the classic fixed-window weakness; for a rate limiter whose purpose is protecting expensive downstream APIs from abuse, allowing double the configured rate at every boundary materially weakens the control.

## Source reference
`lib/rate-limit.ts` — `consumeSlidingWindow(store, key, nowMs, windowMs, limit)`: `weighted = current + previous * ((windowMs - elapsed) / windowMs)`, blocks when `weighted >= limit`, increments the current sub-window only on allow. `lib/nodes/rate-limiter.ts` and `lib/execution-handler.ts` both call it. Counters live in the `rate_limit_counters` table; eviction retains the previous sub-window.

## Notes
This is a sliding-window *counter* (an approximation), not a sliding-window *log* of per-request timestamps — it bounds the rate within a small constant of the limit without storing each request, which is the standard production trade-off (e.g. Cloudflare's approach). Code-level coverage of the boundary math is in `__tests__/lib/rate-limit.test.ts`; node wiring in `__tests__/lib/nodes/db-nodes.test.ts`; per-key 429 in `__tests__/api/chat.test.ts`.
