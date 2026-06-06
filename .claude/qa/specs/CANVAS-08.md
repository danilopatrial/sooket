---
id: CANVAS-08
title: Auto-insert node into existing edge by dragging onto it
severity: medium
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
When a node with both a `primaryInput` and `primaryOutput` defined is dragged from the sidebar and dropped directly onto an existing edge, the edge is split and the new node is inserted between the two previously connected nodes.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- An edge exists between two nodes (e.g. between workflowInput and workflowOutput)

## Steps
1. In the sidebar, select a node that has both input and output handles (e.g. "If", "Cache", "Template String")
2. Drag it from the sidebar and drop it directly on top of the existing edge between two nodes
3. Observe the canvas

## Expected result
- The original edge is removed
- Two new edges are created: one from the original source to the new node's primary input handle, and one from the new node's primary output handle to the original target
- The new node sits visually between the two previously connected nodes
- Net result: source → new node → original target (the pipeline is intact with the new node inserted)

## Failure indicators
- The original edge remains unchanged after dropping the node on it
- The new node is added but the original edge is not split (leaving a disconnected node)
- Three edges exist after the drop (original plus two new ones) instead of two
- Dropping a node with no `primaryInput`/`primaryOutput` (e.g. Merge) incorrectly triggers the split

## Severity rationale
Auto-insert is a workflow ergonomics feature; failure is non-critical but leads to extra manual wiring steps.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 697–728 — after adding the new node, `onDrop` checks `def.primaryInput != null && def.primaryOutput != null`, then calls `findEdgeUnderNode()` using an approximate 224×120 bounding box. If an edge is found under the node, it removes the original edge and inserts two replacement edges connecting source→newNode and newNode→target via the primary handle IDs.
