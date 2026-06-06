---
id: CANVAS-03
title: Node search in sidebar filters across all categories
severity: high
source_files:
  - components/canvas/NodeSidebar.tsx
---

## What this tests
Typing in the sidebar search input filters nodes across all categories by label and subtitle, and shows a "No nodes match" message when the query has no results.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Sidebar is expanded (not collapsed)

## Steps
1. Click the "Search nodes…" input at the top of the sidebar
2. Type `json` — observe the node list
3. Verify nodes from multiple categories appear (e.g. JSON Parser from Format, JSON Builder from Format) and category chips are shown next to each result
4. Clear the input using the `X` button that appears while text is entered
5. Verify the category tab strip and default node list return
6. Type a string that matches nothing (e.g. `zzznomatch`)
7. Observe the empty search result message

## Expected result
- While a query is active: the vertical category tab strip is hidden; the node list shows all nodes whose `label` or `sub` (subtitle) contains the query string (case-insensitive)
- Each result row shows a small uppercase category label chip on the right (`showCategory` prop)
- The `X` clear button appears inside the search input while it contains text; clicking it clears the query and restores the category view
- When no nodes match: the message `No nodes match "[query]"` is displayed (centered, muted text)

## Failure indicators
- Search input has no effect — the node list does not change while typing
- Results only show nodes from the currently active category, not all categories
- The `X` clear button does not appear, or clicking it does not clear the input
- When no results match, a blank area or error is shown instead of the "No nodes match" message
- Category chips are absent from search results

## Severity rationale
Cross-category search is essential for quickly locating nodes; a broken search forces users to manually browse all seven categories.

## Source reference
`components/canvas/NodeSidebar.tsx` lines 77–83 — `searchResults` memo filters `NODE_REGISTRY` by `n.label.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q)`; lines 138–167 — category tab strip hidden when `searchResults` is non-null; lines 171–176 — empty state renders `No nodes match "{query}"` when `searchResults.length === 0`.
