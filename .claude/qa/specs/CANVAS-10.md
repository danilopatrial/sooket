---
id: CANVAS-10
title: Canvas zoom and pan
severity: medium
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
The React Flow canvas supports zooming (via scroll wheel and status-bar buttons) and panning (via click-drag on the background), with zoom clamped between 0.08× and 3×.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Scroll up (mouse wheel) on the canvas — observe zoom increasing
2. Scroll down (mouse wheel) — observe zoom decreasing
3. Click the `+` button in the status bar (bottom-left) — observe zoom increasing
4. Click the `−` button in the status bar — observe zoom decreasing
5. Click the `fit` button in the status bar — observe all nodes fitting into view
6. Click and drag on an empty area of the canvas background — observe the viewport panning
7. Zoom in to maximum: continue scrolling in; verify the canvas stops zooming at 3×
8. Zoom out to minimum: continue scrolling out; verify the canvas stops zooming at 0.08×

## Expected result
- Scroll wheel zooms in/out centered on the cursor position
- `+` button multiplies zoom by 1.4 (clamped to max 3); `−` divides by 1.4 (clamped to min 0.08)
- `fit` button animates the viewport (300ms duration) to fit all nodes
- Dragging on the canvas background pans the viewport
- Zoom never exceeds 3× or goes below 0.08× regardless of input

## Failure indicators
- Scroll wheel has no zoom effect
- The `+` / `−` / `fit` buttons in the status bar do nothing
- Canvas cannot be panned by dragging
- Zoom exceeds 3× or drops below 0.08×

## Severity rationale
Zoom and pan are essential for navigating workflows with many nodes; without them the canvas is nearly unusable for complex pipelines.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 238–243 — `zoomBy(factor)` clamps to `[0.08, 3]` and uses 180ms animation. Lines 1126–1127 — `minZoom={0.08} maxZoom={3}` passed to `<ReactFlow>`. Lines 1329–1341 — status bar renders `+` (`zoomBy(1.4)`), `−` (`zoomBy(1/1.4)`), and `fit` (`fitView({duration: 300})`) buttons.
