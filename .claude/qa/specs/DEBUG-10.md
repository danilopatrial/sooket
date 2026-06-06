---
id: DEBUG-10
title: Logs tab loads and auto-refreshes every 3 seconds
severity: medium
source_files:
  - components/canvas/DebugPanel.tsx
  - app/api/workflows/[slug]/logs/route.ts
---

## What this tests
The "logs" tab of the Debug panel fetches past request logs on mount and polls for new entries every 3 seconds; each log row is expandable to show per-node trace detail.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel; click the "logs" tab

## Steps
1. Click the "logs" tab in the Debug panel header
2. Observe initial load ("Loading…" shown briefly, then log rows or "No requests yet.")
3. In a separate terminal or another browser tab, make a live API request to the workflow (or use the Sandbox to run a test)
4. Wait up to 3 seconds — the new log entry should appear automatically without a page reload
5. Click a log row to expand it
6. Observe the expanded node trace rows

## Expected result
- On mount: shows "Loading…" while fetching; then either log rows or "No requests yet. / Make a request to see logs here."
- Auto-refresh: `setInterval(fetchLogs, 3000)` fires every 3 seconds; new requests appear within 3 seconds
- Each log row (collapsed) shows: timestamp (`toLocaleTimeString()`), model name (or "—"), latency in ms, token counts (if > 0), and node count
- Clicking a row expands it to show `TraceRow` components for each node in that request
- The interval is cleared when the Logs tab unmounts (`clearInterval` in cleanup)

## Failure indicators
- The "logs" tab shows a blank area or perpetual "Loading…" spinner
- Log entries do not appear after making a request (no auto-refresh)
- Clicking a log row does not expand it
- Expanded row shows no node traces even when nodes executed
- Console shows repeated fetch errors (endpoint unreachable)

## Severity rationale
The Logs tab is the primary way to inspect historical production traffic; auto-refresh is essential for live monitoring.

## Source reference
`components/canvas/DebugPanel.tsx` lines 651–668 — `fetchLogs` fetches `GET /api/workflows/${slug}/logs`; `useEffect` calls it immediately then sets `setInterval(fetchLogs, 3000)` with cleanup. Lines 670–734 — renders "Loading…", empty state, or log rows; expanded rows use `TraceRow` components. Line 666 — 3-second polling interval.
