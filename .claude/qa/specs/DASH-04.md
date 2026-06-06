---
id: DASH-04
title: Active workflow is visually distinguished from inactive ones
severity: medium
source_files:
  - components/workflow/WorkflowList.tsx
---

## What this tests
The active workflow's badge renders with a visually distinct style (default variant) compared to inactive workflows (secondary variant), making it easy to identify which workflow is currently serving live traffic.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists with `is_active = 1` and at least one with `is_active = 0`

## Steps
1. Navigate to `http://localhost:3000/workflow`
2. Identify the row with the "Active" badge
3. Compare the badge appearance to rows showing "Inactive"

## Expected result
- The active workflow's badge reads "Active" and uses the `default` Badge variant (typically a solid, prominent color — e.g. white/primary text on dark background per the design system)
- Inactive workflow badges read "Inactive" and use the `secondary` Badge variant (muted/subdued appearance)
- The visual difference between Active and Inactive badges is immediately apparent at a glance

## Failure indicators
- Both "Active" and "Inactive" badges look identical
- An active workflow shows "Inactive" badge or vice versa
- No badge is visible on any workflow row

## Severity rationale
Users rely on the active badge to know which workflow is live; ambiguity here could cause misconfiguration.

## Source reference
`components/workflow/WorkflowList.tsx` line 80 — `<Badge variant={isActive ? "default" : "secondary"}>` where `isActive = Boolean(wf.is_active)`. The two variants map to visually distinct styles defined in the design system.
