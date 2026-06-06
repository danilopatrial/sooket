---
id: CFG-KEY-07
title: View per-key stats panel — requests, tokens, latency, 30-day chart
severity: medium
source_files:
  - components/workflow-config/KeyDashboardPanel.tsx
  - app/api/workflows/[slug]/api-keys/[id]/stats/route.ts
---

## What this tests
Clicking the `BarChart2` icon on a key row opens a stats panel showing total requests (30-day and all-time), token counts, average/min/max latency, and an SVG bar chart of daily request volume over the last 30 days.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab
- At least one API request has been made using the key being inspected

## Steps
1. Locate any key row and click the `BarChart2` icon (right side, sky-blue on hover)
2. Observe the stats panel that opens
3. Verify the four stat cards are present
4. Verify the 30-day bar chart is visible
5. Close the panel by clicking the `X` button

## Expected result
- The stats panel slides in (rendered as an overlay) with:
  - Header showing the key label and `key_hint`
  - Four stat cards: total requests (30-day), total tokens (30-day), avg latency, and all-time requests
  - Numbers formatted via `formatNumber()`: values ≥1M show `N.NM`, ≥1K show `N.NK`, otherwise raw
  - Latency formatted via `formatMs()`: 0 shows "—"; ≥1000ms shows `N.Ns`; otherwise `Nms`
  - An SVG bar chart with 30 bars (one per day, always 30 entries even if some days have 0 requests)
- Clicking `X` closes the panel

## Failure indicators
- Clicking `BarChart2` has no effect (no panel opens)
- Stats panel opens but shows all zeros for a key that has been used
- The bar chart is missing or shows fewer than 30 bars
- Numbers are raw (not formatted with K/M suffixes)
- The `X` button does not close the panel

## Severity rationale
Per-key stats allow users to identify which API consumers are most active and monitor usage patterns; missing stats limit operational visibility.

## Source reference
`components/workflow-config/KeyDashboardPanel.tsx` — `KeyStats` interface (lines 6–17) defines the shape; `BarChart` component (lines 62+) renders an SVG with 30 bars. `app/api/workflows/[slug]/api-keys/[id]/stats/route.ts` lines 52–68 — fills 30 daily entries (zero-padding missing days); lines 24–44 — 30-day aggregates; lines 47–49 — all-time count.
