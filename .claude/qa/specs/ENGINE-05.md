---
id: ENGINE-05
title: Cycle detection throws rather than looping infinitely
severity: critical
source_files:
  - lib/workflow-engine.ts
---

## What this tests
Verifies that the workflow engine detects circular node references during execution using a `visiting` set, throws a descriptive error immediately rather than looping infinitely, and that the error message identifies the offending node ID.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a circular edge configuration exists (or can be created)
- The Debug panel is accessible

## Steps — creating a circular workflow

1. Navigate to the canvas; open the workflow JSON via the Import/Export feature (or use the Debug panel's `__nodes`/`__edges` override)
2. Manually configure a circular edge: Node A → Node B → Node A (A and B each connected to the other)
3. Note: the canvas UI may prevent creating circular edges visually (CANVAS-18 / edge validation); use the `__edges` override in the Debug panel body to inject circular edges for this test

## Steps — execution with direct cycle (A → B → A)

4. In the Debug panel body, use `__edges` to inject edges forming a cycle:
   ```json
   {
     "__edges": [
       {"id": "e1", "source": "nodeA", "target": "nodeB"},
       {"id": "e2", "source": "nodeB", "target": "nodeA"}
     ],
     "__nodes": [...]
   }
   ```
5. Run — expect the execution to fail with an error containing: **Cycle detected: node "nodeA" is part of a circular reference** (or nodeB, whichever is encountered second)
6. Verify the request completes promptly (does not hang indefinitely)

## Steps — verifying error message format

7. The error message is: `Cycle detected: node "${nodeId}" is part of a circular reference`
8. The `nodeId` in the message is the internal node ID of the second time a node is encountered in the evaluation path

## Steps — indirect cycle (A → B → C → A)

9. Configure a three-node cycle: A → B → C → A
10. Run — cycle is detected at one of the nodes (whichever is re-entered); same error message format

## Steps — self-referencing node

11. Configure a node with an edge to itself: `source: "nodeA", target: "nodeA"`
12. Run — cycle detected immediately on the second visit to nodeA

## Steps — cycle through disabled node

13. Create a cycle A → B (disabled) → A; Node B is disabled
14. Run — the visiting set is also updated during disabled-node pass-through evaluation, so cycles through disabled chains are also detected and throw

## Expected result
- Cycle detection: `visiting.has(nodeId)` → throws `Error("Cycle detected: node \"<id>\" is part of a circular reference")`
- Error throws immediately when the cycle is detected (no infinite loop, no timeout)
- The `visiting` set is a shared mutable set for the entire request evaluation
- Nodes are added to `visiting` before their upstream is evaluated; removed after completion
- Works for direct cycles, indirect cycles, self-references, and cycles through disabled nodes

## Failure indicators
- Circular workflow causes the request to hang indefinitely (timeout instead of immediate error)
- Error message does not mention the node ID
- Stack overflow occurs instead of a clean thrown error
- Cycles through disabled nodes are not detected (visiting not updated for disabled path)

## Severity rationale
Without cycle detection, a circular workflow would cause infinite recursion leading to a Node.js stack overflow and process crash, taking down the entire server instance.

## Source reference
`lib/workflow-engine.ts` lines 257-258 (cycle check: `if (visiting.has(nodeId)) throw new Error("Cycle detected: node ...")`), line 288 (`visiting.add(nodeId)` before normal execution), line 316 (`visiting.delete(nodeId)` in `finally`), lines 267-277 (disabled nodes also add/remove from visiting).

## Notes
The `visiting` set is initialized once per top-level `evaluateNode` call and shared across the entire evaluation graph (passed by reference). Memoized results (already in `cache`) are returned before the cycle check, so frequently-evaluated nodes that are not in a cycle do not trigger false positives. The cycle error is thrown as a regular exception — if the cyclic node has a downstream error edge, the error would be caught by that edge's handling (per ENGINE-01).
