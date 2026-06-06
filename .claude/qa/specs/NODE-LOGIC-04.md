---
id: NODE-LOGIC-04
title: Retry node None/Linear/Exponential backoff, clears upstream cache
severity: high
source_files:
  - components/canvas/nodes/RetryNode.tsx
  - lib/nodes/retry.ts
---

## What this tests
Verifies that the Retry node re-attempts its upstream chain on failure using the configured backoff strategy (None/Linear/Exponential), clears the upstream memoization cache between attempts so the upstream node actually re-executes, and routes the final value or last error to the appropriate handle.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Retry node exists on the canvas
- The Debug panel is accessible
- An upstream node that fails intermittently or consistently is available for testing

## Steps — canvas configuration

1. Navigate to the canvas containing a Retry node
2. Observe the node header: title **Retry**, amber RotateCcw icon; subtitle shows the current config in the format `3× · exponential · 1s` (defaults)
3. Confirm one left-side input handle: **input** (amber dot), with hint "upstream"
4. Confirm two right-side output handles: **output** (amber, "value") and **failed** (rose, "string")
5. Verify the **Max Attempts** numeric input (default `3`, min 1, max 10)
6. Change Max Attempts to `5` — header subtitle updates to `5× · exponential · 1s`
7. Verify the **Backoff** select with options: **None (constant)**, **Linear**, **Exponential** (default Exponential)
8. Change Backoff to **Linear** — subtitle updates to `5× · linear · 1s`
9. Verify the **Base Delay (ms)** numeric input (default `1000`, min 0, max 30000, step 100) and, directly below it, the **Max Delay (ms)** numeric input (default `30000`, min 100, max 300000, step 1000) with the hint "caps each backoff delay". Enter `50` in Max Delay and confirm it is rejected (below the 100 ms minimum)
10. Change Base Delay to `500` — subtitle updates to `5× · linear · 500ms` (values < 1000ms shown in ms)
11. Change to `2000` — subtitle shows `2s`

## Steps — execution (success on first try)

12. Set Max Attempts to `3`, Backoff `Exponential`, Base Delay `1000`; connect a node that always succeeds (e.g. a Text node)
13. Open the Debug panel and send a test request; execution completes quickly (no retries)
14. Trace: `output` handle fires with the upstream value; `failed` is `active: false`

## Steps — execution (all attempts fail)

15. Connect a node that always throws (e.g. an HTTP Request to an unreachable URL)
16. Set Max Attempts to `2`, Backoff `None`, Base Delay `0` (to avoid long delays in tests)
17. Run — after 2 failed attempts, trace shows: `output` = `active: false`; `failed` = last error message string
18. Verify the error message in `failed` matches the upstream error (e.g. network error text)

## Steps — cache clearing behavior

19. Connect an Anthropic node upstream; configure it to fail on the first call but succeed on the second (use a flaky test endpoint or a node that checks a counter variable)
20. Set Max Attempts to `3`, Backoff `None`
21. Run — the Retry node should clear the upstream node's cache entry before each retry, so the upstream node re-executes rather than returning its cached (failed) result

## Steps — error case

22. Disconnect the `input` handle and run — expect error: **Retry node has no input connected**

## Expected result
- Max Attempts clamped to 1–10 (inputs outside this range are rejected by the UI validation)
- Backoff delay for each retry (attempt N, base delay B):
  - None: constant delay `B` on every retry
  - Linear: `B × (N−1)` where N is the retry number (first retry: B×1, second: B×2…) — note N is the attempt index, delay is `B × attempt_index`
  - Exponential: `B × 2^(N−1)` (first retry: B×1, second: B×2, third: B×4…)
- **Every per-attempt delay is capped at `maxDelayMs` (default 30000 ms)**: the effective
  delay is `Math.min(computed, maxDelayMs)`. Without this, "10 attempts · exponential ·
  1 s base" would wait `1000 × 2^8 = 256 s` on the last attempt alone; with the 30 s cap
  it waits at most 30 s per attempt. The executor falls back to 30000 ms for a missing,
  zero, negative, or non-finite cap. Effective per-attempt delay range: `0 … maxDelayMs`
- Cache for upstream node ID is cleared before each retry — upstream re-executes fresh
- Success: `output` = value; `failed` = `active: false`
- All attempts exhausted: `output` = `active: false`; `failed` = last error message string
- Default: `"Retry exhausted"` if no error was thrown (shouldn't happen but is the fallback)

## Failure indicators
- `failed` handle never fires even after all attempts fail
- `output` fires simultaneously with `failed` after exhaustion
- Upstream node returns cached result on retries instead of re-executing (cache not cleared)
- Max Attempts field accepts 0 or negative values
- A per-attempt delay exceeds the configured Max Delay (cap not applied) — e.g. exponential backoff at high attempt counts waits minutes
- Subtitle does not update when config changes
- Base Delay shown in seconds for values < 1000ms (should be shown in ms)

## Severity rationale
Retry on failure is a reliability mechanism; if the cache is not cleared between attempts, all retries return the same cached error and the node never actually retries — silently appearing to work while not functioning.

## Source reference
`components/canvas/nodes/RetryNode.tsx` lines 96-98 (subtitle format), lines 122-134 (Max Attempts, min 1 max 10), lines 138-152 (Backoff select), lines 155-171 (Base Delay, min 0 max 30000 step 100), the **Max Delay (ms)** input (min 100, max 300000, step 1000, "caps each backoff delay" hint), lines 53-56 (`formatDelay`); `lib/nodes/retry.ts` clamp to 1–10, `safeMaxDelay` (cap with 30000 fallback for missing/zero/negative/non-finite), `clearUpstreamCache` (deletes all cache keys starting with upstream node ID), `calcDelay` per backoff strategy returning `Math.min(delay, safeMaxDelay)`, the retry loop with cache clear and delay, and the exhausted failed result.

## Notes
The delay formula uses `calcDelay(attempt - 1)` where `attempt` starts at 2 for the first retry. For Linear backoff: first retry delay = `base * 1`, second = `base * 2`. For Exponential: first retry = `base * 2^0 = base`, second = `base * 2^1 = 2*base`. Each computed delay is then clamped to `maxDelayMs` (default 30000 ms) via `Math.min`, so exponential growth can't produce multi-minute waits at high attempt counts. Only the directly connected upstream node's cache is cleared — not the entire chain cache.
