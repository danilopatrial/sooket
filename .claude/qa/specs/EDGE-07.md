---
id: EDGE-07
title: Sub-workflow depth over 5 returns error without crashing
severity: high
source_files:
  - lib/workflow-engine.ts
  - lib/nodes/sub-workflow.ts
---

## What this tests
When a sub-workflow call chain reaches depth 5 (the enforced maximum), `executeSubWorkflow` returns a structured error object `{ error: "Sub-workflow recursion depth exceeded (max 5)" }` instead of looping indefinitely or throwing an uncaught exception.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists that contains a Sub-Workflow node configured to call **its own slug** (self-referential)
- The workflow also has an Input node connected to the Sub-Workflow node, and the Sub-Workflow node connected to an Output node
- The workflow's slug is known (e.g. `recursive-wf`)

## Steps
1. Navigate to the canvas for `recursive-wf`.
2. Add a **Sub-Workflow** node between the Input and Output nodes.
3. In the Sub-Workflow node's **Workflow** dropdown, select `recursive-wf` (this workflow itself).
4. Connect: Input node → Sub-Workflow node → Output node.
5. Save (wait for the `saved` indicator).
6. Open the **Debug Panel** and go to the **Sandbox** tab.
7. Enter a simple JSON body, e.g. `{"x": 1}`.
8. Click **Send**.
9. Wait for the response (it should arrive in well under 1 second).

## Expected result
- The debug panel shows a response with `"ok": false` or a result whose `output` (or `error`) field contains the string `"Sub-workflow recursion depth exceeded (max 5)"`.
- The server does **not** hang, time out, or return a 500 error with a stack trace.
- The execution terminates cleanly: the `traces` array is present (may be empty or contain partial trace entries).

## Failure indicators
- The request hangs indefinitely (server enters an infinite recursion loop).
- The server returns HTTP 500 with a JavaScript stack overflow or "Maximum call stack size exceeded" error.
- No mention of the depth limit in the response — the error is swallowed silently.
- The response does not arrive within 5 seconds.

## Severity rationale
An unbounded recursion without a depth guard would allow a maliciously or accidentally configured workflow to crash the Node.js process via stack overflow, making this a server-stability issue.

## Source reference
`lib/workflow-engine.ts` lines 201–203 — `executeSubWorkflow` checks `if (subDepth >= 5)` before each recursive `executeWorkflow` call and returns `{ value: { error: "Sub-workflow recursion depth exceeded (max 5)" } }` without throwing. The outermost call starts at `subDepth = 0`; each level increments by 1 via `subDepth + 1` (line 209).

## Notes
With a self-referential workflow, the call chain reaches subDepth 5 after 5 nested invocations: depth 0 (top-level debug) → 1 → 2 → 3 → 4 → blocked at 5. The error value propagates back through all 5 Sub-Workflow node executions and surfaces as the final workflow output. Alternatively, a linear chain of 6 separate workflows (each calling the next) produces the same outcome.
