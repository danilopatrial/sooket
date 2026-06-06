---
id: CFG-VAR-04
title: Multiple variable rows can be added and saved in one batch
severity: medium
source_files:
  - components/workflow-config/VariablesTab.tsx
---

## What this tests
The "Add Variables" form supports multiple rows; clicking "Add row" appends a new row; the "Save" button POSTs all valid rows in parallel; successfully saved rows are removed from the form while failed rows remain.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Variables tab

## Steps
1. Locate the "Add Variables" form (one empty row visible by default)
2. Fill in a name and value in the first row
3. Click "Add row" — verify a second empty row appears
4. Fill in a different name and value in the second row
5. Optionally add a third row with an invalid name (to test partial success)
6. Click "Save"
7. Observe the result

## Expected result
- "Add row" button (`Plus` icon, dashed border) appends a new empty `PendingRow` to `rows` state
- "Save" button label: "Saving…" during batch POST, "Save" otherwise
- The batch saves all rows where `name && value && !nameError` in parallel (Promise.all)
- Toast: `N variables saved` when multiple succeed; `$NAME saved` when only one
- Failed rows: individual error toasts per row; those rows remain in the form
- Successful rows: removed from the form after save; if all succeed, form resets to one empty row
- Per-row `Trash2` button removes that row (or resets to empty if it is the last row)

## Failure indicators
- "Add row" button does not add a new row
- Only the first row is saved (batch not working)
- Successfully saved rows are not removed from the form
- "Saving…" does not appear during the POST

## Severity rationale
Batch adding is an efficiency feature for initial setup; missing it forces one-by-one saves.

## Source reference
`components/workflow-config/VariablesTab.tsx` lines 215–219 — "Add row" button appends `makeRow()` to `rows`. Lines 78–113 — `handleSave()` filters valid rows, `Promise.all()` POSTs each, removes saved from form. Lines 74–76 — `removeRow()` removes or resets to `[makeRow()]` if last.
