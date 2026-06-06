---
id: CFG-EXEC-01
title: Execution history list loads with status and timing
severity: medium
source_files:
  - components/workflow-config/ExecutionsTab.tsx
  - app/api/workflows/[slug]/executions/route.ts
---

## What this tests
The Executions tab fetches and displays past workflow runs, each showing a status badge, timestamp, duration, and node count; empty and loading states render correctly.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Executions tab
- At least one workflow execution has occurred (trigger via debug panel or live API)

## Steps
1. Open the Executions config tab
2. Observe the "Execution History" heading and subtitle
3. Verify execution rows appear, each with: ID, status badge, timestamp, duration, node count
4. Observe the empty state if no executions exist

## Expected result
- Executions fetched via `GET /api/workflows/[slug]/executions?limit=20&offset=0`
- Each row shows: `#[id]` (monospace), `StatusBadge`, start time (e.g. "Jun 3, 02:15:00"), duration (`Nms` or `N.NNs`), and node count
- Status badges: Completed (emerald `CheckCircle2`), Failed (red `XCircle`), Crashed (orange `AlertCircle`), Running (yellow spinning `Clock`)
- Loading state: "Loading…" text while first fetch is in flight
- Empty state: dashed box "No executions yet. Trigger the workflow via the API or the debug panel."
- `Refresh` button (`RefreshCw` icon, spins while loading) reloads the current page

## Failure indicators
- Execution rows are absent even when executions exist
- Status badges show the wrong icon/color for a given status
- Timestamps are raw ISO strings instead of formatted locale strings
- "Loading…" is never shown (loading state missing)

## Severity rationale
Execution history is how operators audit workflow behavior in production; if it fails to load, there is no visibility into past runs.

## Source reference
`components/workflow-config/ExecutionsTab.tsx` lines 129–153 — fetches `GET /api/workflows/${slug}/executions?limit=20&offset=${offset}`. Lines 24–51 — `StatusBadge` renders colored icon+text per status. Lines 53–63 — `formatTs()` and `formatDuration()`. Lines 183–187 — empty state. Lines 168–176 — `Refresh` button.
