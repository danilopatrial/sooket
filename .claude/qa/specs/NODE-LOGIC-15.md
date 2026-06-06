---
id: NODE-LOGIC-15
title: Sub-Workflow node executes another workflow via dropdown selector
severity: high
source_files:
  - components/canvas/nodes/SubWorkflowNode.tsx
  - lib/nodes/sub-workflow.ts
---

## What this tests
Verifies that the Sub-Workflow node loads available workflows into a dropdown, passes its input to the selected target workflow, and returns that workflow's output — with token counts propagated.

## Prerequisites
- App is running at http://localhost:3000
- At least two workflows exist (a parent and a target sub-workflow)
- The target workflow is configured with an Input node and an Output node and produces a deterministic output
- The Debug panel is accessible on the parent workflow's canvas

## Steps — canvas configuration

1. Navigate to the canvas containing a Sub-Workflow node
2. Observe the node appearance: title **Sub-Workflow**, small violet Layers icon, dark background (`#141414`), rounded corners; different visual style from other nodes
3. Confirm one left-side input handle (`input`, indigo dot) and one right-side output handle (`output`, indigo dot)
4. In the **Target Workflow** section, observe the dropdown select; it populates from `/api/workflows` on canvas load
5. Verify the dropdown shows all workflows as "**Name (slug)**" options; a default "**— select —**" option is present at the top
6. Select a target workflow from the dropdown — the slug value is persisted to the node data
7. Deselect by choosing "— select —" to clear the target

## Steps — execution (passing an object input)

8. Connect a JSON object value (e.g. `{"message": "hello"}`) to the `input` handle; select a valid target workflow
9. Open the Debug panel and run
10. The sub-workflow receives `{"message": "hello"}` as its request body (plain objects are passed through directly)
11. Expand the Sub-Workflow trace — `output` = the result returned by the target workflow's Output node
12. Verify `inputTokens` and `outputTokens` in the trace include both the Sub-Workflow overhead and any tokens used by the target workflow

## Steps — execution (wrapping non-object input)

13. Connect a scalar value (e.g. the string `"hello"`) to the `input` handle; run
14. The sub-workflow receives `{"input": "hello"}` (non-object inputs are wrapped under the key `"input"`)
15. Connect an array `[1, 2, 3]`; run — sub-workflow receives `{"input": [1, 2, 3]}` (arrays are also wrapped)

## Steps — error cases

16. Disconnect the `input` handle and run — expect error: **Sub-Workflow node has no input connected**
17. Select "— select —" (no slug) and run with input connected — expect error: **Sub-Workflow node: no workflow slug configured**
18. Select a workflow that no longer exists and run — expect an error from `ctx.executeSubWorkflow`

## Steps — fallback text input (no workflows loaded)

19. If the workflows list fails to load (e.g. `/api/workflows` returns an error), the dropdown is replaced by a plain text input field with placeholder `workflow-slug` — verify the slug typed in is used for execution

## Expected result
- Dropdown populates with all workflows from `/api/workflows` as "Name (slug)" entries on canvas load
- Selected slug is persisted to node data
- Plain object inputs: passed directly as the sub-workflow body
- Non-object inputs (string, number, array, null): wrapped as `{"input": value}`
- Sub-workflow result value is passed through to the `output` handle
- Token counts from the sub-workflow execution are added to the node's token totals
- No slug: throws before executing
- No input handle: throws before executing

## Failure indicators
- Dropdown shows no options even when workflows exist
- Plain object input is wrapped in `{"input": {...}}` instead of being used directly
- String/array input is passed unwrapped to the sub-workflow (should be wrapped)
- Token counts from sub-workflow not reflected in parent trace
- Clearing the slug to "— select —" does not prevent execution (empty slug should throw)

## Severity rationale
Sub-workflow failures silently abort the parent workflow; incorrect input wrapping causes the target workflow's Input node to receive an unexpected body shape, breaking all downstream logic.

## Source reference
`components/canvas/nodes/SubWorkflowNode.tsx` lines 31-36 (fetch `/api/workflows` on mount), lines 74-92 (dropdown vs text input fallback), lines 79-83 (option format "name (slug)"); `lib/nodes/sub-workflow.ts` lines 6 (`ctx.inputFor(null)` — reads first connected input), lines 15-18 (object pass-through vs `{input: value}` wrapping for non-objects/arrays), line 24 (`ctx.executeSubWorkflow(slug, subInput)`), lines 27-32 (token accumulation).

## Notes
The node uses `ctx.inputFor(null)` (not a named handle ID) to read its single input — this is a special case in the workflow engine that returns the first connected upstream edge regardless of handle name. Recursion depth is enforced externally by `ctx.executeSubWorkflow` (max depth 5 per ENGINE-04). The dropdown is loaded once on canvas mount; it does not refresh if new workflows are created while the canvas is open.
