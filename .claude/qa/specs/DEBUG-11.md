---
id: DEBUG-11
title: Debug panel can be resized by dragging the top handle
severity: low
source_files:
  - components/canvas/DebugPanel.tsx
---

## What this tests
The 1px drag handle at the top of the Debug panel lets users resize it vertically by clicking and dragging; height is clamped between 120px and 720px; dragging to the minimum closes the panel.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel (click the Bug icon)

## Steps
1. Position the cursor over the thin horizontal bar at the very top of the Debug panel — cursor should change to `cursor-ns-resize`
2. Click and drag upward — observe the panel growing taller
3. Drag downward — observe the panel shrinking
4. Continue dragging down until the panel reaches minimum height (120px) and release — verify the panel closes
5. Reopen the panel — verify it reopens at the default height (380px)

## Expected result
- Mouse cursor becomes `cursor-ns-resize` when hovering the drag handle
- Dragging up increases panel height; dragging down decreases it
- Height is clamped: maximum 720px, minimum 120px
- Releasing at or below 120px (`height <= MIN_HEIGHT`) calls `onClose()` and resets height to 380px (default)
- The handle has a subtle center indicator that turns violet on hover (`group-hover:bg-violet-400/60`)

## Failure indicators
- Dragging the handle has no effect on panel height
- Panel height goes below 120px or above 720px (not clamped)
- Releasing at minimum height does not close the panel
- Cursor does not change to `cursor-ns-resize` over the handle

## Severity rationale
Panel resize is a comfort feature; its failure limits workspace flexibility but does not prevent use of the debug panel.

## Source reference
`components/canvas/DebugPanel.tsx` lines 763–800 — `onHandleMouseDown` records `startY` and `startHeight`; `onMouseMove` computes `delta = startY - ev.clientY` and clamps `height` to `[MIN_HEIGHT=120, MAX_HEIGHT=720]`; `onMouseUp` checks `height <= MIN_HEIGHT` to call `onClose()` and reset to `DEFAULT_HEIGHT=380`. Lines 795–801 — drag handle div with `cursor-ns-resize` and violet hover styling.
