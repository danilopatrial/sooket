---
id: ENGINE-04
title: Sub-workflow recursion depth limit max 5 returns error object
severity: high
source_files:
  - lib/workflow-engine.ts
---

## What this tests
Verifies that when a Sub-Workflow node attempts to call another workflow that would exceed 5 levels of nesting, the engine returns an error object `{ error: "Sub-workflow recursion depth exceeded (max 5)" }` without throwing an exception or hanging.

## Prerequisites
- App is running at http://localhost:3000
- Multiple workflows exist and can call each other via Sub-Workflow nodes
- The Debug panel is accessible

## Steps — setup a chain of sub-workflows

1. Create 6 workflows: **WF1** → **WF2** → **WF3** → **WF4** → **WF5** → **WF6**
2. Each workflow contains a Sub-Workflow node pointing to the next workflow in the chain
3. WF1 is the entry point; WF6 has no sub-workflow call (just passes through its input)

## Steps — execution within depth limit (5 levels)

4. Trigger execution of **WF1** via the Debug panel
5. Depth 0: WF1 starts; calls WF2 (depth 1)
6. Depth 1: WF2 calls WF3 (depth 2)
7. Depth 2: WF3 calls WF4 (depth 3)
8. Depth 3: WF4 calls WF5 (depth 4)
9. Depth 4: WF5 calls WF6 (depth 5 — this is the limit)
10. Verify: at depth 5 (`subDepth >= 5`), the call to WF6 immediately returns `{ error: "Sub-workflow recursion depth exceeded (max 5)" }` — WF6 does NOT execute
11. This error object propagates back up through the chain as the output of the Sub-Workflow node

## Steps — verifying error object shape

12. Chain the final sub-workflow output to the parent workflow's Output node
13. Run WF1 — the final output should include the error object `{"error": "Sub-workflow recursion depth exceeded (max 5)"}` at the deepest level
14. Verify the error is returned as a value, not a thrown exception (the entire workflow chain completes without crashing)

## Steps — recursive self-call

15. Create a workflow that calls itself via a Sub-Workflow node
16. Trigger execution — the self-call increments depth by 1 each time; at depth 5 the recursion guard fires
17. Verify execution completes (does not hang or stack-overflow); returns the error at the 5th nesting level

## Steps — not-found sub-workflow

18. Configure a Sub-Workflow node with a slug that does not exist (e.g. `"nonexistent-workflow"`)
19. Run — output = `{"error": "Sub-workflow not found: \"nonexistent-workflow\""}` (separate error case, no depth involvement)

## Expected result
- `subDepth >= 5`: `executeSubWorkflow` returns `{ value: { error: "Sub-workflow recursion depth exceeded (max 5)" } }` immediately
- Depth is passed as `subDepth + 1` to each recursive call; top-level starts at 0
- Maximum reachable depth before the guard fires: 5 (depths 0, 1, 2, 3, 4 allowed; depth 5 blocked)
- Error is returned as a value (not thrown); downstream nodes receive the error object
- Not-found workflow also returns an error object (not thrown)
- Execution does not hang, stack-overflow, or crash at any depth

## Failure indicators
- Sub-workflow chain deeper than 5 levels executes without error (depth limit not enforced)
- Guard throws instead of returning an error value (crashes the workflow)
- Execution hangs indefinitely on a recursive self-call
- Depth counter is not incremented correctly (e.g. always 0)

## Severity rationale
Without a depth limit, a misconfigured recursive sub-workflow would cause a stack overflow or infinite loop on every request, crashing the server process.

## Source reference
`lib/workflow-engine.ts` lines 201-211 (`executeSubWorkflow` implementation: `if (subDepth >= 5) return error object`, `executeWorkflow` called with `subDepth + 1`, not-found check, error from sub-workflow result propagation).

## Notes
The depth counter is a parameter passed down through the execution chain — it is not stored in any shared state. The top-level `executeWorkflow` call always starts with `subDepth = 0` (default parameter). The `executeSubWorkflow` function at depth 4 will call `executeWorkflow` with `subDepth = 5`, which then passes 5 to any `executeSubWorkflow` calls inside that workflow — those immediately return the error.
