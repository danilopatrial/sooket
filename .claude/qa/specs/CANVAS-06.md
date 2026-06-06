---
id: CANVAS-06
title: Delete a node using the Delete key
severity: high
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Selecting a deletable node and pressing the Delete key removes it from the canvas. The `workflowInput` node is protected and cannot be deleted.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least one non-input node exists (add one from the sidebar if needed)

## Steps
1. Click a non-input node (e.g. the `workflowOutput` node or any added node) to select it
2. Press the `Delete` key
3. Observe the canvas
4. Now click the `workflowInput` node (left-most, with the diamond icon in the top bar) to select it
5. Press the `Delete` key
6. Observe the canvas

## Expected result
- After step 3: the selected non-input node is removed from the canvas; any edges connected to it are also removed
- After step 6: the `workflowInput` node remains on the canvas and is not deleted (it has `deletable: false`)
- The canvas auto-saves after any successful deletion

## Failure indicators
- Pressing Delete on a selected node has no effect
- The `workflowInput` node is deleted (should be protected)
- A node is deleted without being selected first
- Edges connected to the deleted node remain as orphaned connections

## Severity rationale
Node deletion is a standard canvas editing operation; a broken delete key makes it impossible to clean up workflows.

## Source reference
`components/canvas/WorkflowCanvas.tsx` line 1123 — `deleteKeyCode="Delete"` enables Delete-key deletion via React Flow. Lines 564–573 — `handleNodesChange` filters out any remove change targeting `INPUT_ID` (`"__input"`), blocking deletion of the input node. Lines 51–66 — `withDefaultNodes` marks `workflowInput` nodes with `deletable: false`.
