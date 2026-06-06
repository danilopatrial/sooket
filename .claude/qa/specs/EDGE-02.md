---
id: EDGE-02
title: Cycle detection canvas prevents or engine handles circular edges
severity: critical
source_files:
  - lib/workflow-engine.ts
---

## What this tests
Verifies that circular node references — either direct (A → B → A) or indirect (A → B → C → A) — do not cause infinite loops, and are terminated by the engine's cycle detection before causing a stack overflow.

## Prerequisites
- App is running at http://localhost:3000
- Ability to inject a circular edge via the Debug panel's `__edges` override or by importing a workflow JSON with a cycle
- The Debug panel is accessible

## Steps — inject a direct cycle

1. Open the Debug panel; in the body field include an `__edges` override creating a cycle:
   ```json
   {
     "__nodes": [
       {"id": "A", "type": "workflowInput", "data": {}, "position": {"x":0,"y":0}},
       {"id": "B", "type": "stringOps", "data": {"op": "uppercase"}, "position": {"x":200,"y":0}},
       {"id": "C", "type": "workflowOutput", "data": {}, "position": {"x":400,"y":0}}
     ],
     "__edges": [
       {"id":"e1","source":"A","target":"B"},
       {"id":"e2","source":"B","target":"A"},
       {"id":"e3","source":"B","target":"C"}
     ]
   }
   ```
2. Run the debug request
3. Expect a 500 error response containing: **"Cycle detected: node "A" (or "B") is part of a circular reference"**
4. Verify the request completes promptly (within a few seconds) — no hang or timeout

## Steps — indirect cycle (A → B → C → A)

5. Create a 3-node cycle via `__edges`
6. Run — same error: `"Cycle detected: node "..." is part of a circular reference"`
7. Request completes promptly

## Steps — canvas does not natively prevent cycles

8. On the live canvas, attempt to draw an edge from a downstream node back to an upstream node
9. React Flow may allow or prevent this visually — note the behavior
10. If the edge is allowed on canvas, verify the engine's runtime detection still catches it when executed

## Steps — memoized results are not mis-detected as cycles

11. Set up a "diamond" workflow: A → B, A → C, B → D, C → D (D reads from both B and C)
12. Run — executes successfully; A is evaluated once (memoized) and not mis-detected as a cycle
13. Confirm: memoization cache hits do not trigger false cycle detection

## Expected result
- Circular edges: engine throws `"Cycle detected: node "..." is part of a circular reference"` immediately
- No infinite recursion, no stack overflow, no hanging request
- Diamond topology (shared upstream, not a cycle): executes correctly
- Cycle error propagates as a 500 response to the API caller

## Failure indicators
- Request times out or the Node.js process crashes (stack overflow)
- Cycle detection is false-positive: a diamond workflow is incorrectly rejected
- Cycle error does not include the node ID in the message

## Severity rationale
Critical: without cycle detection, a circular workflow causes a process crash, taking down the server for all users.

## Source reference
`lib/workflow-engine.ts` lines 257-258 (`if (visiting.has(nodeId)) throw new Error("Cycle detected: node \"...\" is part of a circular reference")`), line 288 (`visiting.add(nodeId)` before upstream eval), lines 315-316 (`visiting.delete(nodeId)` in `finally`).

## Notes
The canvas editor does not currently validate for cycles at the UI level — the engine is the sole enforcement point. This spec covers the ENGINE-05 behavior from the end-user (edge case) perspective: submitting a cyclically-wired workflow via the debug tool should produce a clear error, not a hang.
