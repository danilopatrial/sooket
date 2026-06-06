---
id: CFG-EXEC-03
title: Failed and crashed executions are visually marked in the list
severity: high
source_files:
  - components/workflow-config/ExecutionsTab.tsx
---

## What this tests
Execution rows with status "failed" show a red `XCircle` badge, and "crashed" rows show an orange `AlertCircle` badge, making them immediately distinguishable from successful executions.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Executions tab
- At least one failed or crashed execution exists (trigger an error condition, e.g. missing API key, or manually set status in DB)

## Steps
1. Observe the execution list
2. Locate a row with status "failed" — verify the badge
3. Locate a row with status "crashed" — verify the badge
4. Compare with a "completed" row — verify distinct styling

## Expected result
- **Completed**: green `CheckCircle2` icon + "Completed" text in `text-emerald-400`
- **Failed**: red `XCircle` icon + "Failed" text in `text-red-400`
- **Crashed**: orange `AlertCircle` icon + "Crashed" text in `text-orange-400`
- **Running**: yellow spinning `Clock` icon + "Running" text in `text-yellow-400`
- Each status uses a distinct icon and color; all badges use `text-xs font-medium`

## Failure indicators
- Failed executions show the same green badge as completed ones
- Crashed executions show "Failed" instead of "Crashed" (wrong status mapping)
- Icons are absent (text-only badges)
- All statuses render with the same color

## Severity rationale
Visual differentiation of execution statuses is essential for operators to quickly identify failures without expanding each row.

## Source reference
`components/workflow-config/ExecutionsTab.tsx` lines 24–51 — `StatusBadge` component: `status === "completed"` → emerald `CheckCircle2`; `status === "failed"` → red `XCircle`; `status === "crashed"` → orange `AlertCircle`; default (running) → yellow spinning `Clock`.
