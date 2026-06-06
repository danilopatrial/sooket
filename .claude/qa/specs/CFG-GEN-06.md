---
id: CFG-GEN-06
title: Cannot delete an active workflow
severity: high
source_files:
  - components/workflow-config/GeneralTab.tsx
  - app/api/workflows/[slug]/route.ts
---

## What this tests
When a workflow is active, the delete button in the Danger Zone is replaced by an amber warning message; the DELETE API also rejects active workflows with a 409 error.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the config General tab of an **active** workflow (`is_active = 1`)

## Steps
1. Scroll to the "Danger Zone" section
2. Observe the Danger Zone content
3. Verify no "Delete" button is visible
4. Verify an amber warning box is shown instead

## Expected result
- When the workflow is active: the "Delete workflow" row and "Delete" button are NOT rendered
- An amber warning box (`border-amber-500/30 bg-amber-500/10`) is shown with a `AlertTriangle` icon and the text "An active workflow cannot be deleted. Deactivate it first."
- The DELETE endpoint also enforces this: `DELETE /api/workflows/[slug]` returns 409 with `{"error": "Cannot delete an active workflow"}` if the workflow is active

## Failure indicators
- A "Delete" button is visible for an active workflow
- Clicking Delete on an active workflow succeeds (deletes it)
- The amber warning is absent when the workflow is active

## Severity rationale
Protecting the active workflow from deletion prevents taking down live API traffic accidentally.

## Source reference
`components/workflow-config/GeneralTab.tsx` lines 229–235 — when `isActive` is true, renders amber warning box instead of the delete section. `app/api/workflows/[slug]/route.ts` lines 31–35 — DELETE handler: `if (workflow.is_active) return NextResponse.json({ error: "Cannot delete an active workflow" }, { status: 409 })`.
