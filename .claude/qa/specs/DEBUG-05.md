---
id: DEBUG-05
title: Delete a test preset
severity: low
source_files:
  - components/canvas/DebugPanel.tsx
  - app/api/workflows/[slug]/presets/route.ts
---

## What this tests
Clicking the trash icon on a preset chip sends a DELETE request and removes the chip from the list immediately.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel; at least one saved preset exists (see DEBUG-04)

## Steps
1. Locate the preset chip list above the Request Body textarea
2. Click the `Trash2` icon on the right side of a preset chip
3. Observe the chip list

## Expected result
- The preset chip is removed from the list immediately (optimistic UI update via `setPresets(prev => prev.filter(...))`)
- A DELETE request is sent to `/api/workflows/[slug]/presets/[id]`
- No confirmation dialog is shown (single-click delete)
- The preset does not reappear on page reload

## Failure indicators
- Clicking the trash icon has no effect (chip remains)
- The chip disappears locally but reappears after a page reload (API delete failed silently)
- A JavaScript error or crash occurs when deleting the last preset

## Severity rationale
Preset cleanup is a quality-of-life feature; its failure is low-impact since presets can simply be ignored.

## Source reference
`components/canvas/DebugPanel.tsx` lines 458–463 — `handleDeletePreset(id)` calls `DELETE /api/workflows/${slug}/presets/${id}`, then filters out the deleted preset from local `presets` state. Errors are silently swallowed. Lines 540–547 — trash button in each preset chip calls `handleDeletePreset(p.id)` on click.
