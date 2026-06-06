---
id: ENGINE-08
title: Memoization each node runs at most once per request
severity: high
source_files:
  - lib/workflow-engine.ts
---

## What this tests
Verifies that the workflow engine's per-request evaluation cache ensures each node is executed at most once per request, even when multiple downstream nodes reference it — and that the cached result is reused for all subsequent references within the same request.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a "diamond" topology exists: Node A → Node B and Node A → Node C; both Node B and Node C feed into a Merge node
- Node A has an observable side effect or counter (e.g. an HTTP Request to a counting endpoint)
- The Debug panel is accessible

## Steps — setup diamond topology

1. Create a workflow:
   - **Input** → **Node A** (HTTP Request to a counting endpoint at `https://httpbin.org/uuid`)
   - **Node A** → **Node B** (String Ops UPPER)
   - **Node A** → **Node C** (String Ops lower)
   - **Node B** + **Node C** → **Merge** (Join mode) → **Output**
2. Both Node B and Node C depend on Node A

## Steps — execution and memoization verification

3. Open the Debug panel and send a test request
4. Observe Node A's trace — it should appear exactly **once** in the execution trace, even though two downstream nodes (B and C) depend on it
5. If Node A were called twice, it would produce two different UUIDs (from httpbin); since it's memoized, both B and C receive the same UUID
6. Verify: Node B output = uppercase of Node A's result; Node C output = lowercase of the same result

## Steps — cache key structure

7. Note that the cache key is `"nodeId:sourceHandle"` — a node with multiple output handles is cached per handle
8. For a node with a single output: cache key is `"nodeId:"`
9. For Router/LanguageDetect with multiple handles: each handle is cached separately, but the node's execution body runs once (the executor stores results in cache for each handle)

## Steps — cache isolation per request

10. Send two separate debug requests
11. Verify Node A executes in each request (cache is per-request, not shared across requests)
12. The two requests produce different UUIDs from httpbin, confirming fresh execution per request

## Steps — memoization with $node expression references

13. Add a Template String node with template `{{ $node.A.uuid }}` (referencing Node A by ID, not by edge)
14. Node A is pre-evaluated via `extractNodeRefs` before the template is resolved — still runs only once
15. Run — Node A executes once; both the edge-connected nodes and the expression-referenced node get the same cached value

## Expected result
- Each node is evaluated at most once per request per `nodeId:sourceHandle` cache key
- A single `Map<string, EvalResult>` (`evalCache`) is created fresh at the start of each request and shared across the entire evaluation
- Multiple downstream nodes referencing the same upstream node all receive the cached result
- Cache is NOT shared across requests — each request gets a fresh `evalCache`

## Failure indicators
- Node A's trace appears twice in the execution log for a single request
- Two downstream nodes of Node A receive different values from the same request (indicates double-execution)
- Side-effecting nodes (HTTP, LLM) execute multiple times per request when referenced by multiple downstream nodes

## Severity rationale
Without memoization, a node referenced by N downstream nodes would execute N times per request — multiplying LLM API costs, latency, and side effects by N.

## Source reference
`lib/workflow-engine.ts` lines 235-236 (cache key `"nodeId:sourceHandle"`, early return if `cache.has(cacheKey)`), line 295 (`cache.set(cacheKey, result)` after execution), line 409 (`evalCache = new Map<string, EvalResult>()` — fresh per request), line 425 (single `evalCache` passed to all `evaluateNode` calls).

## Notes
The memoization key is `nodeId:sourceHandle` — a node with multiple output handles (e.g. Router, LanguageDetect) stores a separate cache entry per handle, but the node's `execute()` function typically computes all handle values at once and manually populates the cache (e.g. `ctx.cache.set(nodeId:handle, value)`). The `$node.<id>` expression system also benefits from this cache since it reads from the same `evalCache` map.
