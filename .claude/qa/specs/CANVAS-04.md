---
id: CANVAS-04
title: Drag node from sidebar onto canvas adds it at drop position
severity: critical
source_files:
  - components/canvas/WorkflowCanvas.tsx
  - components/canvas/NodeSidebar.tsx
---

## What this tests
Dragging a node from the sidebar and dropping it onto the canvas creates a new node at the drop position with the correct type and default data.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Sidebar is expanded

## Steps
1. In the sidebar, click any category (e.g. "Logic")
2. Click and drag a node item (e.g. "If") from the sidebar list onto the canvas
3. Release the mouse button over an empty area of the canvas
4. Observe the canvas

## Expected result
- A new node of the dragged type appears on the canvas at the position where the mouse was released (converted from screen to flow coordinates)
- The node has a unique ID in the format `[type]-[timestamp]` (e.g. `if-1717000000000`)
- The node is initialized with the correct default data from `NODE_DEFAULTS`
- The canvas saves automatically (debounced) after the drop

## Failure indicators
- No node appears on the canvas after dropping
- The node appears at the wrong position (e.g. top-left corner or off-screen)
- A console error or toast error appears after dropping
- The node type is incorrect or shows a blank/unknown node card

## Severity rationale
Drag-and-drop from the sidebar is the primary way to add nodes; failure makes the canvas non-functional for building workflows.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 676–734 — `onDrop` reads `e.dataTransfer.getData("application/reactflow")` for the node type, calls `screenToFlowPosition({x: e.clientX, y: e.clientY})` for placement, then calls `setNodes(nds => [...nds, newNode])`. `components/canvas/NodeSidebar.tsx` line 39 — `onDragStart` sets `e.dataTransfer.setData("application/reactflow", node.type)`.
