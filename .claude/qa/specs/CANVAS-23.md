---
id: CANVAS-23
title: Input node is non-deletable
severity: critical
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
The `workflowInput` node cannot be deleted by any means: keyboard Delete key, drag-to-trash, or copy-paste operations all leave it intact.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Click the `workflowInput` node (leftmost node, the workflow entry point) to select it
2. Press the Delete key — verify the node remains
3. Attempt to drag the `workflowInput` node to the trash zone in the bottom-right corner — verify the trash zone does not appear and the node is not deleted on release
4. Select the `workflowInput` node and press Ctrl+C, then Ctrl+V — verify the paste does not create a duplicate input node

## Expected result
- After pressing Delete: the `workflowInput` node remains on the canvas; no nodes are removed
- While dragging the `workflowInput` node: the trash zone does NOT appear (`isDraggingNode` is not set for `workflowInput`)
- Releasing the `workflowInput` node over any area: it stays on the canvas normally
- The node cannot be removed regardless of interaction method

## Failure indicators
- The `workflowInput` node disappears after pressing Delete
- The trash zone appears when dragging the `workflowInput` node
- The `workflowInput` node is deleted when dragged to the bottom-right corner
- A second `workflowInput` node can be pasted from clipboard

## Severity rationale
Every workflow requires exactly one input node as the entry point for request data; deleting it would make the workflow permanently broken.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 51–66 — `withDefaultNodes()` sets `deletable: false` on any `workflowInput` node and always re-inserts one if missing. Lines 564–573 — `handleNodesChange` filters out any `remove` change targeting `INPUT_ID` (`"__input"`). Lines 417–419 — `onNodeDragStart` returns early for `workflowInput`, preventing the trash zone from appearing. Lines 344–356 — `handleCopy` excludes `workflowInput` from the clipboard.
