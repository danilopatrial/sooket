---
id: CANVAS-21
title: Export workflow to JSON file
severity: medium
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Clicking the Download icon in the canvas status bar exports the current workflow (nodes, edges, and saved test presets) as a downloadable JSON file named after the workflow slug.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Locate the `Download` icon button in the canvas status bar (bottom bar)
2. Click it
3. Observe the browser's download behaviour
4. Open the downloaded file and inspect its contents

## Expected result
- The browser initiates a file download named `[slug].json` (e.g. `abc1234567.json`)
- The downloaded file is valid JSON containing three top-level keys: `nodes`, `edges`, and `presets`
- `nodes` and `edges` reflect the current canvas state
- `presets` contains any saved sandbox test presets for this workflow (fetched from `/api/workflows/[slug]/presets`); it is an empty array `[]` if no presets exist
- The JSON is pretty-printed (2-space indentation)

## Failure indicators
- Clicking the Download button has no effect (no file download starts)
- The downloaded file is not valid JSON
- The file is missing the `nodes`, `edges`, or `presets` keys
- The filename does not match the workflow slug
- The `nodes` or `edges` in the file do not reflect the current canvas state

## Severity rationale
Export is the primary backup and sharing mechanism; failure means users cannot back up or migrate their workflows.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 813–832 — `handleExport()` fetches presets from `/api/workflows/[slug]/presets`, then creates a `Blob` with `JSON.stringify({nodes, edges, presets}, null, 2)` (`type: "application/json"`), creates an `<a>` element with `a.download = slug + ".json"`, and programmatically clicks it. Preset fetch errors are silently swallowed (best-effort).
