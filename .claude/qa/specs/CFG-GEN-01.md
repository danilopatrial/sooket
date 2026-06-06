---
id: CFG-GEN-01
title: Rename a workflow via inline edit with save/cancel
severity: medium
source_files:
  - components/workflow-config/GeneralTab.tsx
  - app/api/workflows/[slug]/route.ts
---

## What this tests
The "Workflow Name" section in the General config tab has an inline edit mode: clicking the pencil icon reveals a text input with Save and Cancel (X) buttons; Enter saves, Escape cancels, and clicking Save sends a PATCH request.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow config page at `/workflow/[slug]/config` (or via the Settings icon on the canvas)
- The General tab is active

## Steps
1. Locate the "Workflow Name" section; the current name is displayed as text next to a `Pencil` icon
2. Click the `Pencil` icon — observe the inline edit mode activates
3. Verify the input is auto-focused and pre-filled with the current name
4. Change the name to something new (e.g. "Renamed Workflow")
5. Click the "Save" button (or press Enter)
6. Verify a "Name updated" toast appears and the displayed name updates
7. Repeat steps 2–3, make a change, then click the `X` cancel button (or press Escape)
8. Verify the name reverts to the previous value and no API call is made

## Expected result
- Clicking `Pencil`: replaces static text with `<input autoFocus>` pre-filled with current name, plus "Save" and `X` buttons
- Save button is disabled if input is empty (`.trim()` is empty) or unchanged
- Saving: PATCHes `/api/workflows/[slug]` with `{name: trimmed}`, shows "Name updated" toast, exits edit mode
- Canceling via `X` or Escape: restores `nameInput` to original name, exits edit mode — no API call
- Empty/unchanged input: clicking Save exits edit mode without API call

## Failure indicators
- Clicking the Pencil icon has no effect
- Input is not auto-focused on edit mode activation
- Pressing Enter does not save; pressing Escape does not cancel
- "Name updated" toast does not appear after a successful save
- The displayed name does not update after saving

## Severity rationale
Renaming is the primary way to distinguish workflows; if it fails, all workflows retain their "Untitled Workflow" default names.

## Source reference
`components/workflow-config/GeneralTab.tsx` lines 17–45 — `editingName` state controls display mode; `handleSaveName()` PATCHes `{name: trimmed}` and shows toast; `handleNameKeyDown()` handles Enter/Escape. Lines 109–150 — JSX: pencil button → `setEditingName(true)`; Save button (disabled when empty/unchanged); X button → cancel.
