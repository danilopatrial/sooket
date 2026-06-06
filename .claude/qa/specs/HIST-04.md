---
id: HIST-04
title: Diff view shows added (green) and removed (red) nodes for selected version
severity: medium
source_files:
  - components/canvas/HistoryPanel.tsx
---

## What this tests
When a version is selected in the History panel, a collapsible "Diff vs. current canvas" section shows which nodes are added (green `+`), removed (red `−`), or unchanged (muted `·`) compared to the current canvas.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least two saved versions exist with different node sets (e.g. add a node, save; the first version lacks that node)

## Steps
1. Open the History panel
2. Click an older version row (one that differs from the current canvas)
3. Observe the bottom section: "Diff vs. current canvas" with `+N`/`-N` counts
4. Click the "Diff vs. current canvas" row to expand it
5. Verify green rows for nodes in the version that are NOT in the current canvas (added in that version = would appear if restored)
6. Verify red rows for nodes in the current canvas that are NOT in the version (removed from current vs. version)
7. Verify muted rows for nodes present in both

## Expected result
- Collapsed diff header shows `+{added.length}` in `text-emerald-400` and `-{removed.length}` in `text-red-400`; "no change" in muted text if identical
- Expanded diff: each added node shows `+` prefix in emerald-400, node type and truncated ID; each removed node shows `−` prefix in red-400; unchanged nodes show `·` in muted `text-white/25`
- The diff is computed by `computeDiff(selectedVersion.nodes, currentNodes)`: a version node is "added" if its ID is absent from current canvas; a current node is "removed" if its ID is absent from the version

## Failure indicators
- The diff section is absent after selecting a version
- Clicking the diff header does not expand it
- Added/removed labels are reversed (green should be nodes the version would restore, red should be what would be lost)
- The `+N` / `-N` counts don't match the expanded list

## Severity rationale
The diff view helps users understand what a restore would change; without it, users must mentally compare two node lists.

## Source reference
`components/canvas/HistoryPanel.tsx` lines 34–58 — `computeDiff()`: iterates version nodes to flag as "added" (absent from current) or "unchanged"; iterates current nodes to flag any not in version as "removed". Lines 109–111 — `added`, `removed`, `unchanged` arrays. Lines 187–229 — diff button shows counts; expanded section renders color-coded rows per category.
