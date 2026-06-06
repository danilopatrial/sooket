---
id: CFG-EXEC-05
title: Pagination Previous/Next works when more than 20 executions exist
severity: medium
source_files:
  - components/workflow-config/ExecutionsTab.tsx
  - app/api/workflows/[slug]/executions/route.ts
---

## What this tests
When more than 20 executions exist, pagination controls appear showing the current range and total; "Next" advances the page, "Previous" goes back; the first page disables "Previous" and the last page disables "Next".

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Executions tab
- More than 20 executions exist for this workflow

## Steps
1. Observe the pagination bar at the bottom: "Showing 1–20 of N" and Previous/Next buttons
2. Verify "Previous" is disabled on the first page
3. Click "Next" — observe the list updates to show rows 21–40 and "Showing 21–40 of N"
4. Verify "Previous" is now enabled; click it — verify the list returns to rows 1–20
5. Navigate to the last page — verify "Next" is disabled

## Expected result
- Pagination bar visible only when `total > 20` (PAGE constant)
- Counter text: "Showing {offset+1}–{min(offset+PAGE, total)} of {total}"
- "Previous" button disabled when `offset === 0`
- "Next" button disabled when `offset + PAGE >= total`
- Clicking Next: sets `offset += 20`, re-fetches `?limit=20&offset=20`
- Clicking Previous: sets `offset -= 20` (min 0), re-fetches

## Failure indicators
- Pagination bar does not appear when more than 20 executions exist
- "Next" button is always disabled (never navigates)
- "Previous" is clickable on the first page
- The counter text does not update after pagination

## Severity rationale
Without pagination, workflows with many executions would either show only 20 or load an unbounded list; navigating history requires working page controls.

## Source reference
`components/workflow-config/ExecutionsTab.tsx` line 136 — `PAGE = 20`. Lines 193–214 — pagination bar rendered when `total > PAGE`; "Previous" disabled when `offset === 0`; "Next" disabled when `offset + PAGE >= total`. Line 140 — fetch URL includes `limit=${PAGE}&offset=${offset}`.
