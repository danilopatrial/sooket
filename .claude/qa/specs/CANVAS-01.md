---
id: CANVAS-01
title: Canvas loads for a workflow slug
severity: critical
source_files:
  - app/workflow/[slug]/page.tsx
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Navigating to `/workflow/[slug]` loads the React Flow canvas editor with the workflow's nodes, edges, and top bar controls.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists (create one via "New Workflow" if needed)

## Steps
1. Navigate to `http://localhost:3000/workflow` and click any workflow row
2. Observe the URL changes to `/workflow/[slug]`
3. Observe the full canvas page layout

## Expected result
- The page renders a dark (`bg-[#0f0f0f]`) full-height canvas area
- A top bar (`h-[52px]`) is visible containing:
  - A violet diamond-shaped icon link (navigates back to `/workflow`)
  - A text input pre-filled with the workflow name
  - An "active" toggle (violet when active, gray when inactive)
  - A `Bug` icon button (debug panel toggle)
  - A `History` icon button (version history toggle)
- The React Flow canvas renders with a dot-grid background
- At minimum two nodes are visible: the `workflowInput` node and the `workflowOutput` node (auto-inserted by `withDefaultNodes()` if not present in saved data)
- No error page or blank screen is shown

## Failure indicators
- The page shows a 404 or "not found" error for a valid slug
- The top bar is absent
- The canvas area is blank with no React Flow viewport
- The workflow name input is empty or shows a wrong name
- No nodes appear on the canvas

## Severity rationale
Canvas loading is the core functionality of the app; failure makes every workflow inaccessible.

## Source reference
`app/workflow/[slug]/page.tsx` — fetches workflow by slug, calls `notFound()` if missing, renders `<WorkflowCanvas>` with `initialName`, `initialNodes`, `initialEdges`, `initialActive`, `initialPinData`. `components/canvas/WorkflowCanvas.tsx` — `withDefaultNodes()` ensures `workflowInput` and `workflowOutput` nodes always exist; top bar rendered at lines 1000–1074.
