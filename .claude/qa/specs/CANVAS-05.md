---
id: CANVAS-05
title: Connect two nodes with an edge
severity: critical
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Dragging from an output handle on one node to an input handle on another creates a directed edge between them.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least two nodes are present (the default input and output nodes suffice)

## Steps
1. Hover over the `workflowInput` node until its output handle (right side) becomes visible
2. Click and drag from the output handle
3. Drag to the input handle on the `workflowOutput` node (left side) and release
4. Observe the canvas

## Expected result
- A directed edge (curved line/arrow) appears connecting the output handle of the source node to the input handle of the target node
- The edge is immediately visible without a page reload
- The canvas auto-saves (debounced) after the connection is made

## Failure indicators
- No edge appears after releasing the drag on a valid handle
- The drag starts but does not snap to the target handle
- An error is thrown or the canvas becomes unresponsive
- The edge disappears immediately after being created

## Severity rationale
Creating edges is the fundamental operation for building a workflow pipeline; without it, no data can flow between nodes.

## Source reference
`components/canvas/WorkflowCanvas.tsx` line 471–477 — `onConnect` callback calls `setEdges(eds => addEdge(connection, eds))` (React Flow's built-in `addEdge`) and then `deferPushHistory()`. Passed to `<ReactFlow onConnect={onConnect}>` at line 1116.
