---
id: ENGINE-03
title: Disabled nodes pass first upstream input through, trace marked disabled
severity: medium
source_files:
  - lib/workflow-engine.ts
---

## What this tests
Verifies that when a node is marked disabled (`node.disabled = true`), the engine skips the node's execution and passes its first upstream main-path input through unchanged — and that the execution trace marks the node as `disabled: true` with null snapshots.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with at least two nodes exists
- The canvas supports disabling nodes (right-click → disable, per CANVAS-15/CANVAS-17)
- The Debug panel is accessible

## Steps — disabling a node

1. Navigate to the canvas; create a workflow: **Text A** (`"value A"`) → **String Ops** (UPPER) → **Output**
2. Right-click the String Ops node and select **Disable** from the context menu
3. Verify the String Ops node shows a visual disabled indicator on the canvas

## Steps — execution with disabled node

4. Open the Debug panel and run a test request
5. Observe the final output — should be `"value A"` (NOT `"VALUE A"`) because the String Ops node was disabled and passed its input through unchanged
6. Expand the String Ops trace row: verify:
   - `disabled: true` is shown
   - `durationMs` = `0`
   - `inputSnapshot` = `null`
   - `outputSnapshot` = `null`
   - The node's own logic (UPPER) was NOT applied

## Steps — pass-through behavior

7. Add a second upstream node: **Text B** (`"value B"`) → also connected to String Ops
8. Disable String Ops; run — only the FIRST upstream main edge input is passed through (whichever is first by edge order); Text B's value is ignored if it's the second edge

## Steps — disabled node with no upstream

9. Disable a node that has no upstream connections (no incoming edges)
10. Run — output of that node = `undefined` (no upstream to pass through; returns `{ value: undefined }`)

## Steps — re-enabling restores execution

11. Right-click the disabled String Ops and select **Enable**
12. Run again — output = `"VALUE A"` (node executes normally again)

## Expected result
- Disabled node: skipped entirely; first upstream main-path input returned as-is (no transformation)
- Disabled node with no upstream: returns `{ value: undefined }`
- Trace entry: `disabled: true`, `durationMs: 0`, `inputSnapshot: "null"`, `outputSnapshot: "null"`, `rawValue: undefined`
- Downstream nodes of a disabled node receive the pass-through value (as if the disabled node were transparent)
- Re-enabling causes normal execution on the next request

## Failure indicators
- Disabled node executes its own logic (non-zero duration, transformation applied)
- Trace does not include `disabled: true` flag
- Disabled node with no upstream throws instead of returning `undefined`
- Both upstream inputs passed through instead of only the first
- Trace shows the actual output value instead of null snapshots

## Severity rationale
Node disabling is a debugging tool; if disabled nodes still execute, the debugging workflow is broken and the isolation purpose is defeated.

## Source reference
`lib/workflow-engine.ts` lines 266-283 (disabled check: finds first upstream main edge, evaluates it for pass-through, trace with `disabled: true` and null snapshots, returns pass-through).

## Notes
The disabled pass-through uses the **first** main-typed edge found by `Array.find` — there is no deterministic ordering guarantee beyond the edge array order in the workflow data. Only `connectionType === "main"` or absent `connectionType` edges are considered; error-typed edges are not used for the pass-through. The `visiting` set is updated during pass-through evaluation to prevent cycles through disabled node chains.
