---
id: CFG-GEN-05
title: Delete an inactive workflow with confirmation required
severity: high
source_files:
  - components/workflow-config/GeneralTab.tsx
  - app/api/workflows/[slug]/route.ts
---

## What this tests
The "Danger Zone" section in the General tab provides a two-step delete flow: clicking "Delete" shows a confirmation panel; clicking "Yes, delete permanently" sends the DELETE request and redirects to the dashboard; "Cancel" aborts.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the config General tab of an **inactive** workflow

## Steps
1. Scroll to the "Danger Zone" section
2. Verify a "Delete workflow" row with a "Delete" button (red border) is visible
3. Click "Delete"
4. Observe the confirmation panel that appears
5. Click "Cancel" — verify the panel reverts to the "Delete workflow" row
6. Click "Delete" again, then click "Yes, delete permanently"
7. Observe the result

## Expected result
- Initial state: "Delete workflow" row with subtitle "Permanently remove this workflow and all its data" and a `Delete` button (`border-destructive/40 text-destructive`)
- After clicking Delete: a destructive confirmation panel appears with:
  - Title "Delete this workflow?" in `text-destructive`
  - Description: "This permanently removes the workflow, all its logs, access list entries, and variables. There is no undo."
  - "Yes, delete permanently" button (red) and "Cancel" button
- Clicking Cancel: returns to the "Delete workflow" row (no API call)
- Clicking "Yes, delete permanently": button shows "Deleting…" and is disabled; on success: toast "Workflow deleted" and `router.push("/workflow")`
- On API error: toast shows the error message; confirmation panel closes

## Failure indicators
- The "Danger Zone" section is absent
- Clicking "Delete" immediately deletes without showing a confirmation
- "Cancel" does not dismiss the confirmation panel
- After successful delete, the user stays on the config page instead of being redirected

## Severity rationale
Two-step confirmation prevents accidental permanent deletion of workflows and all their data.

## Source reference
`components/workflow-config/GeneralTab.tsx` lines 88–104 — `handleDelete()` calls `DELETE /api/workflows/${slug}`, on success toasts and pushes to `/workflow`. Lines 226–273 — Danger Zone section: active state shows warning; `confirmDelete` state controls the confirmation panel; "Yes, delete permanently" calls `handleDelete()`, "Cancel" sets `confirmDelete=false`.
