---
id: CANVAS-02
title: Node sidebar opens, collapses, and lists all node categories
severity: high
source_files:
  - components/canvas/NodeSidebar.tsx
  - components/canvas/nodes/registry.ts
---

## What this tests
The node sidebar on the canvas is visible by default, can be collapsed to a narrow strip, and re-expanded. When open it shows a vertical category tab strip with all seven node categories.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Observe the left side of the canvas — a sidebar (220px wide) should be visible
2. Verify the sidebar shows a vertical tab strip with these category labels (rotated text): **AI**, **Request**, **External**, **Format**, **Logic**, **Transform**, **Static**
3. Click each category tab and verify the node list updates to show nodes in that category
4. Click the `ChevronLeft` (collapse) button at the top-right of the sidebar
5. Verify the sidebar collapses to a narrow strip (~32px) showing only a `ChevronRight` button
6. Click the `ChevronRight` button to re-expand
7. Verify the sidebar returns to full width (220px) with the search bar and category tabs restored

## Expected result
- Default state: sidebar is 220px wide, showing a search input, vertical category tabs, and a node list
- Category tabs visible: AI, Request, External, Format, Logic, Transform, Static (in that order)
- Active category tab has a white vertical indicator bar on its left edge
- Collapsed state: sidebar shrinks to 32px showing only a `ChevronRight` icon
- Re-expanding restores the full sidebar with search and tabs

## Failure indicators
- The sidebar is not visible when the canvas loads
- Fewer than seven category labels appear in the tab strip
- Clicking a category tab does not change the node list
- The collapse button has no effect (sidebar stays wide)
- After collapsing, the expand button does not restore the sidebar

## Severity rationale
The sidebar is the primary way to add new nodes; if it cannot be opened or navigated, the canvas is non-functional.

## Source reference
`components/canvas/NodeSidebar.tsx` — `collapsed` state controls 32px vs 220px width; `NODE_CATEGORIES` from `registry.ts` drives the tab strip: `["ai", "request", "external", "format", "logic", "transform", "static"]` with labels AI, Request, External, Format, Logic, Transform, Static. `ChevronLeft` collapses, `ChevronRight` expands.
