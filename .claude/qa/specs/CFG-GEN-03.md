---
id: CFG-GEN-03
title: Activating a workflow deactivates all other workflows
severity: critical
source_files:
  - components/workflow-config/GeneralTab.tsx
  - app/api/workflows/[slug]/route.ts
---

## What this tests
When a workflow is activated via the Status toggle in the General tab, the API automatically deactivates all other workflows in the database, ensuring only one is active at a time.

## Prerequisites
- App is running at http://localhost:3000
- At least two workflows exist; one is currently active

## Steps
1. Navigate to the config page of an **inactive** workflow (`/workflow/[slug]/config`)
2. Note the active workflow (visible on the dashboard as "Active")
3. Click the Status toggle to activate this workflow
4. Navigate to `/workflow` (the dashboard)
5. Verify the previously active workflow now shows "Inactive"
6. Verify only the newly activated workflow shows "Active"

## Expected result
- After activating: only one workflow has `is_active = 1` across the entire database
- The dashboard shows exactly one "Active" badge
- The previously active workflow's badge changes to "Inactive"
- This behavior is enforced server-side regardless of how the PATCH is made

## Failure indicators
- Two workflows show "Active" after the toggle
- The previously active workflow still shows "Active"
- The newly toggled workflow shows "Active" locally but reverts on page reload

## Severity rationale
Multiple simultaneously active workflows would route all API traffic to only one of them based on key lookup, potentially causing silent misconfiguration in production.

## Source reference
`app/api/workflows/[slug]/route.ts` lines 78–83 — PATCH handler: when `body.is_active` is truthy, runs `UPDATE workflows SET is_active = 0 WHERE slug != ?` before setting the target workflow active. `components/workflow-config/GeneralTab.tsx` lines 71–86 — `handleToggleActive()` sends `{is_active: next}` via PATCH.
