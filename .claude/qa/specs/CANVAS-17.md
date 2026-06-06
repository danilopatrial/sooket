---
id: CANVAS-17
title: Right-click node opens context menu with disable, pin, and re-run options
severity: medium
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Right-clicking a node on the canvas opens a floating context menu with three actions: "Re-run from here", "Disable node" / "Enable node", and a pin-related option.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least one non-input node exists on the canvas

## Steps
1. Right-click any node (not the workflowInput node) on the canvas
2. Observe the context menu that appears
3. Verify the menu contains: "Re-run from here", "Disable node", and a pin-related item
4. Click "Disable node" — verify the node becomes dimmed and the menu closes
5. Right-click the same node again — verify the menu now shows "Enable node" instead of "Disable node"
6. Click outside or press Esc — verify the menu dismisses
7. Right-click a node that has no prior execution result — verify the pin item shows "Pin output (run first)" and is disabled (not clickable)

## Expected result
- A dark floating panel (`bg-[#1a1a1a]`, min-width 180px) appears near the right-click position
- Menu items present:
  - **"Re-run from here"** (violet hover): opens the Debug panel and triggers a re-run starting from this node
  - **"Disable node"** / **"Enable node"**: toggles the node's disabled state; label reflects current state
  - **"Unpin output"** (amber color, shown only when node is pinned) OR **"Pin output (run first)"** (disabled/grayed, shown when node has no pinned result)
- Menu closes on: clicking an item, pressing Esc, or clicking anywhere else on the page

## Failure indicators
- Right-clicking a node does not open any menu
- Menu appears but is missing one of the three action items
- "Disable node" and "Enable node" do not toggle (label stays the same after clicking)
- Menu does not close when clicking outside it

## Severity rationale
The context menu is the only UI surface for disable/enable and pin actions; its absence blocks those workflows.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 1162–1226 — node context menu rendered when `nodeMenu` state is set (triggered by `onNodeContextMenu` at line 538); items: "Re-run from here" (lines 1169–1182), "Disable/Enable node" (lines 1183–1204), pin item (lines 1205–1224). Dismissed via Esc/mousedown listener set up at lines 549–561.
