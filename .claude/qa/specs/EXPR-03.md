---
id: EXPR-03
title: "{{ $node.<id> }} resolves to upstream node output"
severity: high
source_files:
  - lib/expr.ts
---

## What this tests
Verifies that `{{ $node.<id> }}` inside a node configuration field resolves to the cached output value of the referenced upstream node, enabling cross-node data access without explicit edge connections.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with at least two executed nodes where the downstream node references an upstream node's ID in a VarField
- The canvas must show the upstream node's internal ID (visible in the URL or DevTools)
- The Debug panel is accessible

## Steps — finding a node ID

1. Open the canvas for the test workflow
2. Right-click an upstream node (e.g. a Text node emitting `"hello"`) and open browser DevTools
3. Inspect the node element or network requests to find its internal ID (a short alphanumeric string like `"abc123"`)
   Alternatively: view the workflow JSON in the Debug panel's `__nodes` override to see node IDs

## Steps — setup

4. Create a workflow:
   - **Node A** (Text node, ID `nodeA`): outputs `"upstream value"`
   - **Node B** (Template String node): template = `{{ $node.nodeA }}` — **not** wired by an edge to Node A
   - Output node connected to Node B
5. In the Debug panel, wire Node A into the execution graph so it executes (connect it to the Input node)

## Steps — execution ($node reference)

6. Open the Debug panel and run
7. Output should be `"upstream value"` — Node B resolved `{{ $node.nodeA }}` from Node A's cached execution result
8. Verify this works even though there is no canvas edge between Node A and Node B

## Steps — path drilling

9. Change Node A to output `{"status": "ok", "count": 5}`
10. Change Node B template to `Status: {{ $node.nodeA.status }}`
11. Run — Output = `"Status: ok"` (drills into Node A's output object)
12. Change to `{{ $node.nodeA.count }}` — Output = `5` (raw number from pure expression)

## Steps — unresolvable reference

13. Use `{{ $node.nonexistent }}` where `nonexistent` is not a valid node ID in the workflow
14. Run — expression returns `undefined`; pure expression keeps original `{{ $node.nonexistent }}` literal; mixed string keeps block verbatim

## Steps — cache lookup mechanics

15. Note that `{{ $node.<id> }}` looks up `cache.get("nodeId:")` (with trailing colon) — it resolves to the primary output of the node, not a specific handle
16. If Node A has not been evaluated yet (not in the execution path), the reference returns `undefined`

## Expected result
- `{{ $node.<id> }}` pure expression: returns the raw cached output value of the node with that ID
- `{{ $node.<id>.<path> }}` drills into the node's output using dot-notation
- Node must have executed earlier in the same request for its value to be in cache
- Cache miss (node not executed or wrong ID): returns `undefined` → kept verbatim
- No canvas edge required — expression-based reference is independent of the edge graph

## Failure indicators
- `{{ $node.<id> }}` returns `undefined` for a node that has already executed in the same request
- Path drilling returns `undefined` for a valid nested key in the node's output
- Non-existent node ID throws instead of keeping the expression literal
- Expression resolves to a stringified value even in a pure-expression context

## Severity rationale
Node references allow flexible data wiring without explicit edges; broken resolution silently inserts literal `{{ $node.id }}` text into LLM prompts or comparison fields.

## Source reference
`lib/expr.ts` lines 38-48 (`$node.<id>` resolution: `cache.get(`${nodeId}:`)`, path drilling), lines 88-93 (pure expression raw return on valid value), lines 99 (mixed: undefined/null → block kept verbatim).

## Notes
The cache key for node output is `"nodeId:"` (node ID followed by a colon) — this corresponds to the primary output handle. The expression resolver does not support referencing a specific named handle (e.g. `$node.abc123:myHandle`) — only the primary output (`nodeId:`) is accessible via `$node` expressions. Node IDs are internal random strings, not the display names visible on the canvas.
