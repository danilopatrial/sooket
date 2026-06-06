---
id: CANVAS-24
title: Canvas top bar workflow name is editable inline
severity: high
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
The workflow name in the canvas top bar is a live text input; edits update local state immediately and are persisted when the user clicks the "Save" button.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Locate the text input in the top bar (pre-filled with the current workflow name, 256px wide)
2. Click the input and change the name to something new (e.g. "My Renamed Workflow")
3. Observe that the input reflects the new text immediately
4. Click the "Save" button
5. Reload the page
6. Verify the renamed workflow name is shown in the input after reload

## Expected result
- The name input (`w-64`, `bg-[#1e1e1e]`, `border border-white/[0.08]`) is editable and reflects typing in real time
- On focus: border changes to violet (`focus:border-violet-500/40`) with a subtle ring
- Clicking Save persists the new name via `PATCH /api/workflows/[slug]` with `{name: ...}` in the payload
- After page reload, the canvas loads with the updated workflow name

## Failure indicators
- The name field is read-only and cannot be edited
- Typing in the field does not update the displayed text
- Saving and reloading the page shows the old workflow name (change not persisted)
- The input loses the typed value before saving

## Severity rationale
Workflow naming is essential for identifying pipelines in the dashboard; if names cannot be changed, all workflows remain "Untitled Workflow".

## Source reference
`components/canvas/WorkflowCanvas.tsx` line 249 — `name` state initialized from `initialName`. Lines 1013–1018 — controlled `<input type="text" value={name} onChange={setName}>`. Lines 762–789 — `handleSave()` includes `name` in the PATCH payload to `/api/workflows/[slug]`. There is no `onBlur` auto-save; persistence requires an explicit Save button click.
