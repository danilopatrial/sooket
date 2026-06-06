---
id: DEBUG-01
title: Debug panel opens and closes
severity: high
source_files:
  - components/canvas/DebugPanel.tsx
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Clicking the Bug icon in the canvas top bar opens the Debug panel; clicking it again (or dragging the handle to the minimum height) closes it.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Locate the `Bug` icon button in the top bar (right side)
2. Click it — observe the Debug panel appearing at the bottom of the canvas
3. Verify the panel has two tabs: "sandbox" and "logs"
4. Verify the panel has a drag handle at the top (`cursor-ns-resize`)
5. Click the `Bug` icon again — verify the Debug panel closes

## Expected result
- Clicking the Bug icon toggles `debugOpen` state; the panel renders when `debugOpen` is `true`
- Default panel height: 380px
- Panel contains a thin drag handle (1px bar with a centered 8px wide indicator), followed by a header row with "sandbox" / "logs" tabs and a Run button (shown only on Sandbox tab)
- The active tab is highlighted (`bg-white/[0.08] text-white`); inactive tab is muted
- Clicking the Bug icon a second time hides the panel (`debugOpen = false`)

## Failure indicators
- The Bug icon button has no effect (panel does not appear)
- Panel appears but shows no tabs or header
- Clicking the Bug icon again does not close the panel
- The panel appears at an incorrect height or position

## Severity rationale
The debug panel is the primary testing interface for workflows; if it cannot be opened, no sandbox testing is possible.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 1047–1059 — Bug icon button toggles `debugOpen` via `setDebugOpen(v => !v)`. Lines 1309+ — `{debugOpen && <DebugPanel ...>}`. `components/canvas/DebugPanel.tsx` lines 7–9 — `MIN_HEIGHT=120`, `MAX_HEIGHT=720`, `DEFAULT_HEIGHT=380`. Lines 756–820 — panel renders with `height` state, drag handle, and "sandbox"/"logs" tab strip.
