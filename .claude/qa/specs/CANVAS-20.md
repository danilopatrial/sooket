---
id: CANVAS-20
title: S key opens node search overlay with keyboard navigation
severity: medium
source_files:
  - components/canvas/NodeSearchMenu.tsx
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Pressing S while hovering over the canvas (not in an input field) opens a floating `NodeSearchMenu` overlay at the mouse position; the overlay supports text filtering, arrow-key navigation, Enter to add, and Esc to close.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Mouse is positioned over the canvas area (not inside a node input field)

## Steps
1. Move the mouse to an empty area of the canvas
2. Press the S key — observe the search overlay appearing
3. Type a search term (e.g. "if") — verify the list filters
4. Press ArrowDown — verify the highlighted item moves down
5. Press ArrowUp — verify it moves back up
6. Press Enter — verify the highlighted node is added to the canvas at the cursor position and the overlay closes
7. Press S again to reopen, then press Esc — verify the overlay closes without adding a node
8. Click outside the overlay — verify it also closes

## Expected result
- S key opens a 288px-wide dark floating panel (`w-72 bg-[#1a1a1a]`) near the mouse position, clamped to the viewport
- Input is auto-focused on open; placeholder reads "Search nodes…"
- Results are grouped by category (AI, Request, External, Format, Logic, Transform, Static) with category headers
- Filtering matches against node `label`, `sub`, `category`, and `CATEGORY_LABEL` (case-insensitive)
- Active item is highlighted (`bg-white/[0.08]`); mouse hover also updates the active index
- ArrowDown/Up navigate through the flat `filtered` list; indices clamp at 0 and `filtered.length - 1`
- Enter selects the active node and adds it to the canvas; Esc closes without action
- Clicking outside the menu closes it; "No nodes found" message shows when query has no matches

## Failure indicators
- S key has no effect when hovering the canvas
- Overlay does not filter results when typing
- ArrowDown/Up do not move the highlighted item
- Enter does not add a node or close the overlay
- Esc does not close the overlay
- The overlay appears outside the visible viewport (not clamped)

## Severity rationale
The S-key overlay is a fast-access alternative to the sidebar for power users; keyboard navigation is core to its utility.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 512–518 — S/s key (canvas-only, not typing) calls `setSearchMenu({screenPos, flowPos})`. `components/canvas/NodeSearchMenu.tsx` lines 34–44 — filters `NODE_REGISTRY`; lines 56–68 — `handleKeyDown` maps Arrow/Enter/Esc; lines 71–73 — clamps position to viewport; lines 99–137 — renders grouped results with category headers.
