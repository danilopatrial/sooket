---
id: CANVAS-18
title: Right-click edge opens context menu to toggle main/error connection type
severity: medium
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Right-clicking an edge opens a floating menu with two options — "Main connection" and "Error connection" — allowing the user to change how the edge is treated during execution.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least one edge exists between two nodes

## Steps
1. Right-click an existing edge (the line between two nodes)
2. Observe the context menu that appears
3. Verify it contains "Main connection" (with a gray dot) and "Error connection" (with a red dot)
4. The currently active type should appear highlighted (white background `bg-white/5`)
5. Click "Error connection"
6. Observe the edge visual style changes (red, dashed)
7. Right-click the same edge again — verify "Error connection" is now the highlighted active option
8. Click "Main connection" to revert — verify the edge returns to its normal gray style

## Expected result
- Context menu appears with two items: "Main connection" and "Error connection"
- The active connection type is visually highlighted (`bg-white/5`); the inactive one is muted (`text-white/50`)
- Selecting "Error connection" sets `connectionType: "error"` on the edge, rendering it as red dashed (`stroke: #ef4444, strokeDasharray: "5 4"`)
- Selecting "Main connection" clears `connectionType` (`undefined`), rendering the edge as the default gray (`stroke: #4a4a4a`)
- Menu closes after selection; the change is pushed to history (undo-able)

## Failure indicators
- Right-clicking an edge does not open any menu
- Menu appears but the active type is not visually distinguished
- Selecting "Error connection" does not change the edge color to red/dashed
- Selecting "Main connection" does not restore the default gray edge style
- The menu does not close after a selection

## Severity rationale
Error edges are how workflows route failures to recovery paths; if they cannot be set, the Try/Catch and error-routing features are inaccessible from the canvas UI.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 1228–1277 — edge context menu renders when `edgeMenu` state is set (triggered by `onEdgeContextMenu` at line 479); "Main connection" clears `connectionType` (line 1246), "Error connection" sets `connectionType: "error"` (line 1268). Lines 606–614 — `styledEdges` applies red dashed styling for error edges.
