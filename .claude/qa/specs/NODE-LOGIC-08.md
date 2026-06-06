---
id: NODE-LOGIC-08
title: Cache node TTL-based hit/miss and formatted TTL display
severity: high
source_files:
  - components/canvas/nodes/CacheNode.tsx
  - lib/nodes/cache.ts
---

## What this tests
Verifies that the Cache node serves cached values on hit (without re-evaluating the value input), stores new values on miss, respects the configured TTL, and displays the TTL in a human-readable format in the header.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Cache node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Cache node
2. Observe the node header: title **Cache**, teal Layers icon; subtitle shows formatted TTL (default: **1h TTL**)
3. Verify two left-side input handles: **key** (teal, type "any") and **value** (teal, type "lazy")
4. Verify two right-side output handles: **output** (teal, type "value") and **hit** (amber, type "bool")
5. In the **TTL (seconds)** field, verify default value `3600`; change it to `120` — subtitle updates to **2m TTL**
6. Change to `45` — subtitle updates to **45s TTL**
7. Change to `7200` — subtitle updates to **2h TTL**
8. Change to `3600` to restore the default; confirm the field rejects values below 1

## Steps — execution (cache miss then hit)

9. Connect a text node `"user-query"` to the `key` handle; connect an Anthropic or HTTP node (something with observable latency) to the `value` handle
10. Open the Debug panel and send a first test request
11. Expand the Cache trace: `output` = the value from the connected node, `hit` = `false` (cache miss)
12. Send a second identical request immediately
13. Expand the trace again: `output` = same value as before, `hit` = `true`; verify the `value` upstream node did **not** re-execute (its trace is absent or marked cached — the value handle is lazy-evaluated only on miss)

## Steps — TTL expiry

14. Set TTL to `1` (1 second); run a request (cache miss, stores entry)
15. Wait 2 seconds; run again — `hit` = `false` (entry expired); the value node re-executes

## Steps — key hashing

16. Change the key to `"different-query"` and run — `hit` = `false` (different key produces different cache entry)
17. Run again with same key — `hit` = `true`

## Steps — error cases

18. Disconnect the `key` handle and run — expect error: **Cache node has no key input connected**
19. Disconnect the `value` handle (keep `key` connected) and run — expect error: **Cache node has no value input connected**

## Expected result
- TTL display: ≥3600s → "Nh TTL"; ≥60s → "Nm TTL"; <60s → "Ns TTL"
- Cache miss: value input is evaluated, result stored under SHA-256(workflowId + key); `hit` = `false`
- Cache hit: value input is NOT evaluated; cached value returned; `hit` = `true`
- Cache key is derived from `wf:{workflowId}:{JSON.stringify(keyValue)}` hashed with SHA-256
- TTL field minimum: 1 (values below 1 are rejected)
- Expired entries are evicted on miss (not on hit)

## Failure indicators
- `hit` = `true` on the first request for a key (nothing was cached yet)
- Value input executes on cache hit (should be lazy — skipped on hit)
- TTL display shows seconds when value is ≥60 (should show minutes)
- Expired entries still produce hits after TTL has elapsed
- Different key inputs produce the same cache hit

## Severity rationale
A broken cache hit check causes expensive upstream operations (LLM calls, HTTP requests) to re-execute on every request instead of being served from cache, directly increasing cost and latency.

## Source reference
`components/canvas/nodes/CacheNode.tsx` lines 49-53 (`formatTtl` function), lines 96-105 (key/value rows with "lazy" hint); `lib/nodes/cache.ts` lines 16-21 (SHA-256 key derivation), lines 25-34 (cache hit path: returns cached value, skips value eval), lines 36-54 (cache miss path: evaluates value, stores entry with TTL expiry).

## Notes
The `value` input is labeled "lazy" because it is only evaluated on a cache miss — the value handle's upstream chain does not execute when a cached entry is found. The cache key includes the workflow ID to prevent key collisions across different workflows on the same instance.
