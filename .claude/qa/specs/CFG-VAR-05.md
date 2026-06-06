---
id: CFG-VAR-05
title: Delete a variable
severity: medium
source_files:
  - components/workflow-config/VariablesTab.tsx
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
Clicking the `Trash2` icon on an existing variable row sends a DELETE request and removes the variable from the list immediately.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Variables tab
- At least one variable exists

## Steps
1. Locate a variable row in the existing variables list
2. Click the `Trash2` icon on the right side of that row
3. Observe the result

## Expected result
- A `DELETE /api/workflows/${slug}/variables?name=[encodedName]` request is sent immediately (no confirmation step)
- While deleting: the `Trash2` button is disabled (`opacity-40`) for that specific row only
- On success: toast `$NAME deleted` appears; the variable row is removed from the list via local state filter; the VarField autocomplete context is refreshed (`refresh()`)
- On error: toast "Failed to delete variable"

## Failure indicators
- Clicking `Trash2` has no effect
- The variable row remains after a successful DELETE
- No toast appears after deletion
- The delete button is not disabled while the request is in flight for that row

## Severity rationale
Variable deletion is needed to remove stale or compromised secrets; a broken delete leaves the system cluttered with unusable variables.

## Source reference
`components/workflow-config/VariablesTab.tsx` lines 115–128 — `handleDelete(name)` sets `deletingName` to the variable name (disables its button), calls `DELETE /api/workflows/${slug}/variables?name=...`, on success toasts `$${name} deleted`, filters from `vars`, calls `refresh()`. Lines 165–174 — `Trash2` button disabled when `deletingName === v.name`.
