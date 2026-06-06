---
id: HIST-01
title: Version history list loads most recent first
severity: medium
source_files:
  - components/canvas/HistoryPanel.tsx
  - app/api/workflows/[slug]/versions/route.ts
---

## What this tests
Clicking the History icon opens the History panel, which fetches up to 50 saved versions ordered most-recent-first and renders each as a timestamped row with a "latest" badge on the first entry.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least one save has been performed (each Save creates a version snapshot)

## Steps
1. Click the `History` icon button in the canvas top bar
2. Observe the History panel that slides in from the right (width 288px)
3. Verify version rows appear with timestamps
4. Verify the topmost row has a "latest" badge in violet
5. Close the panel by clicking the `X` button in the panel header

## Expected result
- The panel title reads "Version History"
- While loading: "Loading…" is shown
- Each version row shows: timestamp formatted as "Mon DD, HH:MM:SS" (via `toLocaleString` with `month: "short", day: "numeric", hour/minute/second: "2-digit"`) and node count below it
- The first row (most recent, index 0) shows a `latest` badge in `text-violet-400/70`
- Versions are ordered most-recent-first (`ORDER BY id DESC`)
- Maximum 50 versions shown (API `LIMIT 50`)
- Empty state: "No saved versions yet. Save nodes or edges to create one."
- Clicking the `X` closes the panel

## Failure indicators
- The History panel does not open when clicking the History icon
- Version rows are in wrong order (oldest first)
- The "latest" badge is missing or on the wrong row
- Timestamps are malformed or show raw ISO strings
- More than 50 rows are shown

## Severity rationale
Version history is the primary rollback mechanism; if it fails to load the list, users cannot recover from accidental changes.

## Source reference
`components/canvas/HistoryPanel.tsx` lines 83–104 — fetches `GET /api/workflows/${slug}/versions`, sets `versions` state; lines 155–179 — renders version rows with `formatVersionTime(v.created_at)` and `latest` badge for `i === 0`. `app/api/workflows/[slug]/versions/route.ts` line 24 — `ORDER BY id DESC LIMIT 50`.
