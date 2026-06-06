---
id: NODE-REQ-01
title: Output node marks workflow exit point with no configurable fields
severity: high
source_files:
  - components/canvas/nodes/OutputNode.tsx
---

## What this tests
Verifies that the Output node renders as the workflow's API response exit point, has a single left-side input handle and no output handles, exposes no configurable fields, and cannot be deleted from the canvas.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists and its canvas is open

## Steps

1. Navigate to the canvas for any workflow
2. Locate the **Output** node — it should be present by default on every new workflow
3. Observe the node appearance:
   - Title: **Output**
   - Subtitle: **API response**
   - A blue right-side vertical accent bar (3 px wide)
   - A blue-tinted ArrowLeft icon on the right
   - Width narrower than most nodes (approximately 176 px / `w-44`)
4. Confirm the node has exactly **one input handle** on the left side (blue dot) and **no output handles** on the right side
5. Click the Output node to select it — observe a blue selection ring and blue shadow glow (not violet)
6. Verify the node body contains **no configurable fields** — no text inputs, no dropdowns, no sliders
7. Attempt to delete the Output node (press Delete/Backspace or use the right-click context menu) — the node must not be deletable (deletion should be blocked or the option absent)
8. Open the Debug panel and send a test request; the value arriving at the Output node's input handle becomes the API response body — verify the response in the panel matches what was passed into the Output node

## Expected result
- Output node renders with blue accent styling (not violet/amber/rose)
- Exactly one input handle, zero output handles
- No configuration UI whatsoever
- Node cannot be deleted from the canvas
- The value connected to the Output node's input is returned as the workflow's API response

## Failure indicators
- Output node has output handles on the right side
- Any configurable field (input, dropdown, toggle) appears on the node body
- Output node can be deleted like a regular node
- The API response does not reflect the value connected to the Output node

## Severity rationale
The Output node is the mandatory workflow exit point; if it were deletable or misconfigured, every workflow execution would fail to return a response.

## Source reference
`components/canvas/nodes/OutputNode.tsx` — entire file; single `Handle type="target"` on `Position.Left` (line 29), no source handles, no form fields rendered.

## Notes
The Output node has no execution file — it is a graph terminator. The workflow engine treats it as the final node whose input value becomes the HTTP response. Non-deletability is enforced in `WorkflowCanvas.tsx`, not in this component.
