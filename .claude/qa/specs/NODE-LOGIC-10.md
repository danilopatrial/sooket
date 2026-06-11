---
id: NODE-LOGIC-10
title: Rate Limiter node block/delay on quota exceeded, IP/global/custom key
severity: high
source_files:
  - components/canvas/nodes/RateLimiterNode.tsx
  - lib/nodes/rate-limiter.ts
---

## What this tests
Verifies that the Rate Limiter node enforces per-window request quotas using the configured key source (IP, global, or custom), blocks or delays requests that exceed the limit, and displays the current configuration in the header subtitle.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Rate Limiter node exists on the canvas
- The Debug panel is accessible (can send multiple rapid requests)

## Steps — canvas configuration

1. Navigate to the canvas containing a Rate Limiter node
2. Observe the node header: title **Rate Limiter**, orange Gauge icon; subtitle shows **100 req / 1m · block** (defaults)
3. Verify two left-side input handles: **input** (orange) and **key** (orange)
4. Verify two right-side output handles: **output** (orange, "value") and **blocked** (rose, "string")
5. In **Key Source**, verify three options: **IP address** (default), **Workflow (global)**, **Custom (key input)**
6. With **IP address** selected: the `key` handle row shows type "—" (dimmed) — custom key input not used
7. Switch to **Custom (key input)**: key row brightens, type shows "string"
8. Switch back to **IP address**
9. In **Window (seconds)**, verify default `60`; change to `10` — subtitle updates to **100 req / 10s · block**
10. In **Max Requests**, change to `2` — subtitle updates to **2 req / 10s · block**
11. In **On Breach**, verify two options: **Block (active: false)** and **Delay then pass**
12. Switch to **Delay then pass** — a **Delay (ms)** field appears (min 0, max 30000, step 100, default 1000); subtitle updates to **2 req / 10s · delay**
13. Switch back to **Block** — Delay field disappears

## Steps — execution (block mode)

14. Set limit to `2`, window to `60`, action to **Block**, key source to **Workflow (global)**
15. Open the Debug panel; send 3 rapid requests
16. First 2 requests: `output` handle passes input through; `blocked` = `active: false`
17. Third request: `output` = `active: false`; `blocked` = an error string containing the count, limit, and window (e.g. `"Rate limit exceeded: 3/2 requests in 60s window"`)

## Steps — execution (delay mode)

18. Switch action to **Delay then pass**, delay `500ms`
19. Reset window (wait 60s or switch key source to a new unique custom key)
20. Send 3 rapid requests — all three complete, but the third has ~500ms additional latency
21. `output` fires for all three; `blocked` = `active: false` for all

## Steps — key source

22. Switch key source to **IP address** — rate limit tracks per client IP (`ctx.reqCtx.ip`)
23. Switch to **Custom**: connect a text node providing `"user-123"` to the `key` handle — rate limit tracks per that string value

## Steps — error case

24. Disconnect the `input` handle and run — expect error: **Rate Limiter node has no input connected**

## Expected result
- Key Source: IP = per-client IP; Workflow = single global counter; Custom = value from `key` handle
- Window display: ≥3600s → "Nh", ≥60s → "Nm", <60s → "Ns"
- Delay field only visible when action is "Delay then pass"
- Within limit: `output` = input value; `blocked` = `active: false`
- On breach, block: `output` = `active: false`; `blocked` = string with count/limit/window info
- On breach, delay: waits `delayMs` ms then passes; `output` = input value; `blocked` = `active: false`
- Counter uses a **sliding-window counter** (shared `consumeSlidingWindow` in `lib/rate-limit.ts`): the previous window's count is weighted by the fraction of it still overlapping the current window, so a burst straddling a boundary is **not** allowed to pass ~2× the limit. See NODE-LOGIC-10b for the boundary behavior.

## Failure indicators
- Requests above the limit still pass on `output` in block mode
- A burst straddling a window boundary passes ~2× the limit (boundary not smoothed — regressed to a fixed/tumbling window)
- `blocked` string is empty or undefined on breach
- Delay field visible when action is "Block"
- Key source switch doesn't change which counter is incremented (all requests share one counter regardless of IP)
- Subtitle doesn't update when window, limit, or action changes

## Severity rationale
A broken rate limiter allows unlimited traffic through, enabling DoS conditions on downstream services (LLM APIs, databases).

## Source reference
`components/canvas/nodes/RateLimiterNode.tsx` (`formatWindow`, subtitle format, conditional Delay field); `lib/nodes/rate-limiter.ts` — key derivation per source, then `consumeSlidingWindow(...)` from `lib/rate-limit.ts` for the decision, async eviction of windows older than the previous one (the previous window is retained because the sliding estimate weights it), and breach handling (block = inactive output, delay = wait then pass, blocked message format).

## Notes
The counter is a **sliding-window counter**, not a tumbling window. `lib/rate-limit.ts` computes `weighted = currentCount + previousCount * ((windowMs - elapsed) / windowMs)` and blocks when `weighted >= limit`. The previous window's influence decays from full (at the boundary) to zero (at window end), so a burst that would have passed ~2× the limit across a boundary under a tumbling window is now blocked. The same `consumeSlidingWindow` algorithm backs the per-API-key limiter (see API-08), so the two enforcement points share semantics. Eviction is asynchronous (`setImmediate`) and retains the previous window.
