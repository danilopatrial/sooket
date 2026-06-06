---
id: CFG-GEN-02
title: Toggle workflow active/inactive from the General config tab
severity: critical
source_files:
  - components/workflow-config/GeneralTab.tsx
  - app/api/workflows/[slug]/route.ts
---

## What this tests
The Status section in the General tab has a toggle switch that activates or deactivates the workflow, with optimistic UI update, success/failure toast, and descriptive status text.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config page (Settings icon on canvas, or `/workflow/[slug]/config`)
- The General tab is active

## Steps
1. Observe the "Status" section: note the current active state (text reads "Active" or "Inactive"), the descriptive subtitle, and the toggle switch color
2. Click the toggle switch
3. Observe the UI change and toast notification
4. Verify the toggle reflects the new state

## Expected result
- **When activating** (inactive → active): toggle becomes `bg-emerald-600` with thumb at `translate-x-6`; status text changes to "Active" / "Receiving traffic on POST /api/v1/chat"; toast shows "Workflow activated"
- **When deactivating** (active → inactive): toggle becomes `bg-input` (gray) with thumb at `translate-x-1`; status text changes to "Inactive" / "Not receiving any traffic"; toast shows "Workflow deactivated"
- Toggle is disabled (`opacity-50`) while the PATCH request is in flight
- On API failure: toast shows "Failed to update status"; state does not change

## Failure indicators
- Clicking the toggle has no visual effect
- Status text does not change after toggling
- No toast appears after toggling
- Toggle remains disabled after the request completes

## Severity rationale
The active toggle controls live traffic routing; incorrect behavior could silently disable a production workflow.

## Source reference
`components/workflow-config/GeneralTab.tsx` lines 67–86 — `handleToggleActive()` PATCHes `{is_active: next}`, updates `isActive` state, shows toast. Lines 193–222 — Status section renders "Active"/"Inactive" text, subtitle, and toggle button with emerald/gray color classes and thumb position based on `isActive`.
