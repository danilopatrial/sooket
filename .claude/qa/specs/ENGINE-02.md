---
id: ENGINE-02
title: Pin data skips node execution and marks trace as pinned true
severity: high
source_files:
  - lib/workflow-engine.ts
---

## What this tests
Verifies that when a node has pinned data (`workflow.pinData[nodeId]`), the engine skips its execution entirely and returns the frozen pinned value — and that the execution trace marks the node as `pinned: true` with zero duration and no input snapshot.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with at least two nodes exists
- The canvas supports pinning node output (right-click → pin data, per CANVAS-17)
- The Debug panel is accessible

## Steps — pinning a node's output

1. Navigate to the canvas; run a successful debug request so the execution trace is populated
2. In the execution trace, locate a node with a specific output value (e.g. a Text node outputting `"pinned value"`)
3. Right-click that node on the canvas to open the context menu; select **pin** (or similar) to pin its last output
4. The node should show a visual indicator that it is pinned

## Steps — verifying pinned execution

5. Modify the node so its natural execution would produce a different value (e.g. change the Text node's content to `"different value"`)
6. Run another debug request
7. Expand the pinned node's trace row — verify:
   - `output` = `"pinned value"` (the original pinned result, NOT the updated text)
   - `durationMs` = `0` (node was not executed)
   - `inputSnapshot` = `null` (no inputs were evaluated)
   - The trace row shows a **pinned** indicator
8. Confirm the node's downstream consumers receive the pinned value `"pinned value"`, not `"different value"`

## Steps — upstream of pinned node is not evaluated

9. Create a workflow: **Node A** → **Node B** (pinned) → **Output**
10. Configure Node A with a side effect (e.g. HTTP Request that logs to an external service)
11. Pin Node B's output
12. Run a debug request — Node A should NOT execute (Node B is pinned; its inputs are not evaluated)
13. Verify in the Debug panel that Node A's trace is absent or also shows as skipped

## Steps — unpinning restores normal execution

14. Right-click the pinned node and select **unpin**
15. Run another debug request — Node B now executes normally and returns the updated value `"different value"`

## Expected result
- Pinned node: `evaluateNode` returns `workflow.pinData[nodeId]` immediately without calling `runNode`
- Pinned node trace: `pinned: true`, `durationMs: 0`, `inputSnapshot: "null"`, `outputSnapshot` = the pinned value (truncated to 4KB if large)
- Upstream nodes of a pinned node are NOT evaluated (short-circuit before `inputFor` is called)
- Downstream nodes receive the pinned value as if the node had executed normally
- Unpinning causes normal execution to resume on the next request

## Failure indicators
- Pinned node executes (non-zero durationMs in trace, actual node runs)
- Trace does not include `pinned: true` flag
- Upstream nodes of pinned node still execute
- Pinned value is not returned to downstream nodes
- Modifying the pinned node's config changes its output during a pinned run

## Severity rationale
Pin data is the primary debugging mechanism for partial re-runs; broken pinning causes unnecessary upstream node execution (including expensive LLM calls) and makes debugging non-deterministic.

## Source reference
`lib/workflow-engine.ts` lines 239-254 (pin data short-circuit: `workflow.pinData?.[nodeId]` check, cache set, trace push with `pinned: true` and `durationMs: 0`, immediate return of pinned value).

## Notes
`workflow.pinData` is a map of `nodeId → EvalResult`. It is set in the workflow data passed to `executeWorkflow` — typically via the Debug panel's partial re-run feature or the canvas pin action. The pinned check runs before the memoization cache check, before cycle detection, and before any upstream node evaluation.
