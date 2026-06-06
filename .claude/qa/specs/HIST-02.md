---
id: HIST-02
title: Restore a previous version
severity: high
source_files:
  - components/canvas/HistoryPanel.tsx
  - app/api/workflows/[slug]/versions/route.ts
---

## What this tests
Selecting a version in the History panel and clicking "Restore this version" POSTs to the versions endpoint, updates the canvas with the restored nodes/edges, and snapshots the restored state as a new version entry.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least two saved versions exist (save, add a node, save again)

## Steps
1. Open the History panel (click the `History` icon)
2. Click a non-latest version row to select it (it highlights violet)
3. Observe the "Diff vs. current canvas" summary at the bottom
4. Click "Restore this version" button
5. Observe the canvas and the History panel
6. Verify the canvas shows the nodes/edges from the restored version

## Expected result
- Clicking a version row: selects it (highlighted `bg-violet-500/10`); the bottom panel shows a diff summary and a "Restore this version" button
- While restoring: button shows "Restoring…" and is disabled
- On success: `onRestore()` is called, updating the canvas with `selectedVersion.nodes` and `selectedVersion.edges`
- The History panel refreshes its version list (a new snapshot of the restored state is inserted by the API)
- The restored state is now the current canvas state (nodes/edges on canvas match the selected version)

## Failure indicators
- Clicking a version row does not select/highlight it
- The "Restore this version" button is not visible after selecting a version
- Clicking "Restore this version" has no effect on the canvas
- The canvas still shows the post-restore state instead of the version's nodes/edges
- Version list does not refresh after restore (new snapshot not appended)

## Severity rationale
Restore is the critical action that justifies version history; without it the history panel is read-only and useless for recovery.

## Source reference
`components/canvas/HistoryPanel.tsx` lines 113–128 — `handleRestore()` POSTs `{versionId}` to `/api/workflows/${slug}/versions`, then calls `onRestore(nodes, edges)` and `fetchVersions()`. `app/api/workflows/[slug]/versions/route.ts` lines 37–78 — POST handler: validates `versionId`, inserts a snapshot of the restored state as a new version, trims to 50 versions, updates `workflows.nodes/edges`.
