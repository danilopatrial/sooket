---
id: CANVAS-16
title: Keyboard shortcuts — Ctrl+A, Ctrl+C, Ctrl+V, S key
severity: medium
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Four canvas keyboard shortcuts work correctly: Ctrl+A selects all nodes, Ctrl+C copies selected nodes to clipboard, Ctrl+V pastes them centered on the current mouse position, and S opens the node search overlay.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Click on the canvas background (not an input field) to ensure canvas focus

## Steps
1. Press Ctrl+A — observe all nodes become selected
2. Press Ctrl+C — copies selected nodes (no visible change, internal clipboard)
3. Move the mouse to a different position on the canvas
4. Press Ctrl+V — observe pasted nodes appear centered on the mouse position
5. Verify pasted nodes have new unique IDs and are selected; original nodes remain unselected
6. Press S key while hovering over the canvas — observe a node search overlay opening
7. Press S key while an input field is focused inside a node — verify the search overlay does NOT open

## Expected result
- **Ctrl+A**: all nodes on the canvas become selected (including input node)
- **Ctrl+C**: selected non-input nodes are stored in an internal clipboard; `workflowInput` node is excluded from copy
- **Ctrl+V**: pasted nodes appear at positions centered on current mouse cursor (flow coordinates); edges between pasted nodes are also pasted; new IDs assigned
- **S key** (while mouse is over canvas, not in an input): `NodeSearchMenu` overlay opens at mouse position
- **S key** while typing in an input/textarea: no canvas search is triggered

## Failure indicators
- Ctrl+A does not select all nodes
- Ctrl+V places nodes at a wrong position (e.g. origin 0,0 or on top of originals)
- The `workflowInput` node is included in a copy/paste operation
- S key does not open the search overlay when hovering the canvas
- S key triggers search while typing in a node input field

## Severity rationale
These shortcuts are standard canvas editing affordances; their absence slows down workflow building but does not prevent it.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 344–409 — `handleCopy` copies selected non-input nodes; `selectAll` sets all nodes to `selected: true`; `handlePaste` centers pasted nodes on `screenToFlowPosition(mouseScreenPos.current)`. Lines 499–518 — keyboard handler: `Ctrl+a` → `selectAll`, `Ctrl+c` → `handleCopy`, `Ctrl+v` → `handlePaste`; `S` key (canvas only, not typing) → `setSearchMenu(...)`. Shortcuts are suppressed when `target` is INPUT, TEXTAREA, or contentEditable.
