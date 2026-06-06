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
- Counter uses a fixed-window (tumbling) bucket: resets at the start of each window period. This is **not** a sliding window — a burst straddling a window boundary can pass up to twice the limit across the two adjacent buckets

## Failure indicators
- Requests above the limit still pass on `output` in block mode
- `blocked` string is empty or undefined on breach
- Delay field visible when action is "Block"
- Key source switch doesn't change which counter is incremented (all requests share one counter regardless of IP)
- Subtitle doesn't update when window, limit, or action changes

## Severity rationale
A broken rate limiter allows unlimited traffic through, enabling DoS conditions on downstream services (LLM APIs, databases).

## Source reference
`components/canvas/nodes/RateLimiterNode.tsx` lines 58-62 (`formatWindow`), line 86 (subtitle format), lines 191-211 (conditional Delay field); `lib/nodes/rate-limiter.ts` lines 33-40 (key derivation per source), lines 49-51 (tumbling window + async eviction), lines 55-72 (breach handling: block = inactive output, delay = wait then pass), lines 66 (blocked message format).

## Notes
The counter window is a fixed-window (tumbling) window, **not a sliding window**: `Math.floor(now / window) * window`. Requests at the boundary of a new window start a fresh counter, so a burst straddling a boundary can pass up to twice the limit across the two adjacent buckets — a true sliding window would block that second burst. Counter eviction is asynchronous (`setImmediate`) so stale counters from prior windows don't block request processing.
