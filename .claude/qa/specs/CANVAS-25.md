---
id: CANVAS-25
title: Canvas top bar active toggle activates and deactivates the workflow
severity: critical
source_files:
  - components/canvas/WorkflowCanvas.tsx
  - app/api/workflows/[slug]/route.ts
---

## What this tests
Clicking the "active" toggle in the top bar sends a PATCH request to update `is_active`; activating a workflow automatically deactivates all other workflows; a success toast confirms the action; on failure the toggle reverts.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least one other workflow exists (to verify the "deactivate others" behavior)

## Steps
1. Observe the current toggle state (violet = active, gray = inactive)
2. Click the toggle to change the active state
3. Observe the toggle animates and a success toast appears
4. Navigate to `/workflow` (dashboard) and verify the active badge reflects the new state
5. If you activated this workflow, verify the other workflow's badge changed to "Inactive"
6. Navigate back to the canvas and click the toggle again to revert

## Expected result
- Toggle click immediately updates the UI (optimistic): toggle flips color and position (thumb translates 18px when active)
- A PATCH request to `/api/workflows/[slug]` is sent with `{is_active: true/false}`
- On success: toast shows "Workflow activated" or "Workflow deactivated"
- When activating (`is_active: true`): the API runs `UPDATE workflows SET is_active = 0 WHERE slug != ?`, deactivating all other workflows
- On API failure: the toggle reverts to its previous state and shows "Failed to update status" toast
- The toggle button is disabled (`opacity-60`) while the request is in flight

## Failure indicators
- Clicking the toggle has no visual effect
- No toast appears after toggling
- Other workflows remain active after activating this one (deactivation of others not occurring)
- The toggle does not revert on API failure
- The dashboard badge does not match the canvas toggle state

## Severity rationale
The active toggle controls which workflow serves live API traffic; incorrect behavior could silently disable the wrong workflow or leave multiple active simultaneously.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 792–811 — `toggleActive()` optimistically updates `isActive`, sets `toggling=true` (disables button), PATCHes `{is_active: next}`, reverts on error with `toast.error`. `app/api/workflows/[slug]/route.ts` lines 78–83 — PATCH handler: when `body.is_active` is true, runs `UPDATE workflows SET is_active = 0 WHERE slug != ?` before setting the target workflow active.
