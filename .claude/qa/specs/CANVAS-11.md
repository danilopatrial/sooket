---
id: CANVAS-11
title: Minimap renders and is interactive
severity: low
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
A minimap overlay is visible on the canvas and clicking/dragging it pans the main viewport.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Observe all four corners and edges of the canvas for a minimap widget
2. If a minimap is present, click a location on it and observe whether the main canvas viewport pans to that area
3. If a minimap is present, drag within it and observe viewport tracking

## Expected result
- A minimap widget is visible somewhere on the canvas (typically bottom-right)
- Clicking a point in the minimap moves the main viewport to center on that area
- Nodes appear as small shapes within the minimap reflecting their canvas layout

## Failure indicators
- No minimap widget is visible anywhere on the canvas
- The minimap is present but clicking/dragging it has no effect on the main viewport

## Severity rationale
The minimap is a navigation aid for large workflows; its absence increases friction but does not break core functionality.

## Source reference
`components/canvas/WorkflowCanvas.tsx` — `MiniMap` is **not imported or rendered** as of this review (no `MiniMap` import from `@xyflow/react`, no `<MiniMap>` in the JSX). The React Flow `<ReactFlow>` component is rendered without a `<MiniMap>` child.

## Notes
Verify in source: as of reading, no minimap component exists in `WorkflowCanvas.tsx`. This test is expected to **fail** (no minimap renders). If a minimap is added in future, update this spec with the exact component and its placement.
