---
id: HIST-03
title: Up to 50 versions are shown in the history panel
severity: low
source_files:
  - app/api/workflows/[slug]/versions/route.ts
  - components/canvas/HistoryPanel.tsx
---

## What this tests
The History panel displays at most 50 version entries; older versions beyond that limit are not shown and are pruned from the database when a restore creates a new snapshot.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with more than 50 saved versions (requires repeatedly saving; this is a boundary test)

## Steps
1. Open the History panel
2. Count the visible version rows (or inspect the API response at `/api/workflows/[slug]/versions`)
3. Verify no more than 50 rows appear

## Expected result
- The GET response from `/api/workflows/[slug]/versions` returns at most 50 entries (`LIMIT 50`)
- The History panel renders all returned entries without additional client-side capping
- If exactly 50 versions exist: all 50 rows are shown; if fewer exist: all are shown

## Failure indicators
- More than 50 rows appear in the History panel
- The API response contains more than 50 version entries

## Severity rationale
The 50-version cap is a data hygiene limit; exceeding it is minor, but confirms the retention policy is enforced.

## Source reference
`app/api/workflows/[slug]/versions/route.ts` line 24 — `ORDER BY id DESC LIMIT 50` caps the GET response. Line 69 — after a restore, a `DELETE` prunes the table to keep only the 50 most recent entries for the workflow: `DELETE FROM workflow_versions WHERE workflow_id = ? AND id NOT IN (SELECT id FROM workflow_versions WHERE workflow_id = ? ORDER BY id DESC LIMIT 50)`.
