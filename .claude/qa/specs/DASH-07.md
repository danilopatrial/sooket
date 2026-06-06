---
id: DASH-07
title: Delete button absent for active workflows
severity: high
source_files:
  - components/workflow/WorkflowList.tsx
---

## What this tests
The trash icon delete control is not rendered for the currently active workflow, preventing users from accidentally deleting the live workflow.

## Prerequisites
- App is running at http://localhost:3000
- At least one **active** workflow exists (is_active = 1)
- At least one **inactive** workflow exists (is_active = 0) for comparison

## Steps
1. Navigate to `http://localhost:3000/workflow`
2. Locate the row with the "Active" badge
3. Inspect the right edge of that row for a trash icon or delete control
4. Compare with an inactive workflow row which should show a trash icon

## Expected result
- The active workflow row has no trash icon, no "Delete?" confirmation area, and no delete-related controls visible on its right side
- The inactive workflow row shows a trash icon (`Trash2`) on its right side
- The active row's right edge ends cleanly at the badge with no extra UI element

## Failure indicators
- A trash icon appears on the active workflow row
- Clicking anywhere on the active workflow row reveals a delete confirmation
- Both active and inactive rows show the same delete controls

## Severity rationale
Allowing deletion of the active workflow would take down live API traffic; the guard must be present at the UI level.

## Source reference
`components/workflow/WorkflowList.tsx` line 87 — `{!isActive && (<div ...>...</div>)}` — the entire delete control block (trash button and confirmation inline UI) is conditionally rendered only when `isActive` is false.
