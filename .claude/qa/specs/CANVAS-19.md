---
id: CANVAS-19
title: Drag node to trash zone (bottom-right) to delete it
severity: medium
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Dragging any deletable node over the trash zone that appears in the bottom-right corner of the canvas and releasing it deletes the node and its connected edges.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least one non-input node exists on the canvas

## Steps
1. Click and hold a non-input node to begin dragging it
2. Observe the bottom-right corner of the canvas while dragging — a trash zone should appear
3. Drag the node over the trash zone and observe its visual state change
4. Release the mouse button while over the trash zone
5. Observe the canvas

## Expected result
- While dragging (not over trash): a trash zone appears at the bottom-right (`bottom-4 right-4`) showing a trash icon and "Drop to delete" text; it is semi-transparent (`opacity-70`, gray border)
- While dragging **over** the trash zone: the zone scales up (`scale-110`), turns red (`border-red-500/60 bg-red-500/20 text-red-400`), and text changes to "Release to delete"
- On release over trash zone: the node is removed from the canvas; all edges connected to that node are also removed
- The `workflowInput` node cannot be dragged to the trash (drag-start for `workflowInput` does not show the trash zone)

## Failure indicators
- The trash zone does not appear when dragging a node
- The trash zone appears but does not change color when hovering over it
- Releasing over the trash zone does not delete the node
- The `workflowInput` node can be deleted via the trash zone
- Edges connected to the deleted node remain on the canvas as orphans

## Severity rationale
An alternative deletion path for users who prefer drag-to-delete over keyboard Delete; failure is a UX regression but not critical.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 417–441 — `onNodeDragStart` sets `isDraggingNode=true` (skipped for `workflowInput`); `onNodeDrag` updates `isOverTrash` via `checkOverTrash()`; `onNodeDragStop` removes the node and its edges when `checkOverTrash()` is true. Lines 1282–1306 — trash zone div: `opacity-0` normally, `opacity-70` while dragging, `opacity-100 scale-110 red` when `isOverTrash`.
