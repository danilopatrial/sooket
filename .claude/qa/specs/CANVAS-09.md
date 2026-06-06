---
id: CANVAS-09
title: Canvas Save button persists workflow with "saved" indicator
severity: critical
source_files:
  - components/canvas/WorkflowCanvas.tsx
  - app/api/workflows/[slug]/route.ts
---

## What this tests
Clicking the "Save" button in the top bar sends a PATCH request with the current nodes and edges, shows "Saving…" while in flight, and briefly displays "saved" after success.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Make any change on the canvas (e.g. move a node or rename the workflow)
2. Click the "Save" button in the top-right of the top bar
3. Observe the button label while the request is in flight
4. Observe the top bar after the request completes
5. Reload the page and verify the change persisted

## Expected result
- While saving: the button label reads "Saving…" and the button is disabled
- After success: the button returns to "Save" and the text "saved" appears in the top bar (visible for approximately 3 seconds, then disappears)
- After page reload: the canvas loads with the previously saved state (nodes, edges, name match what was saved)

## Failure indicators
- The button label does not change to "Saving…" while the request is in flight
- The "saved" indicator never appears after clicking Save
- A "Failed to save" error toast appears
- After page reload, changes made before saving are lost

## Severity rationale
Persistence is core to the app's value; unsaved changes would cause data loss every session.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 762–790 — `handleSave()` sets `saving=true`, PATCHes `/api/workflows/[slug]` with `{name, is_active, nodes, edges}`, then on success sets `showSaved=true` (displayed at line 1020: `{showSaved && <span>saved</span>}`) and clears it after 3000ms. On error: `toast.error("Failed to save")`.

## Notes
The 800ms debounce in this component applies to **in-memory undo/redo history snapshots** (`pushHistory`), not to API saves. There is no auto-save — all persistence requires an explicit click of the "Save" button.
