---
id: CANVAS-07
title: Delete an edge using the Delete key
severity: high
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Selecting an edge and pressing the Delete key removes it from the canvas.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least one edge exists between two nodes

## Steps
1. Click on an existing edge (the connection line between two nodes) to select it — it should visually highlight when selected
2. Press the `Delete` key
3. Observe the canvas

## Expected result
- The selected edge is removed from the canvas immediately
- The two nodes that were connected remain on the canvas (only the edge is deleted)
- The canvas auto-saves after the deletion (debounced)

## Failure indicators
- Pressing Delete on a selected edge has no effect
- Both the edge and connected nodes are deleted
- The edge reappears after deletion
- No visual selection state appears when clicking an edge

## Severity rationale
Edge deletion is required to rewire workflows; an inability to delete edges would prevent any workflow restructuring.

## Source reference
`components/canvas/WorkflowCanvas.tsx` line 1123 — `deleteKeyCode="Delete"` enables Delete-key deletion for both nodes and edges via React Flow. Lines 575–581 — `onEdgesChange` calls `deferPushHistory()` when any `remove` change is present, ensuring history is updated after edge deletion.
