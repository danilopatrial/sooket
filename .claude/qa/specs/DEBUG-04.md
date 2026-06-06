---
id: DEBUG-04
title: Save and load a test preset
severity: medium
source_files:
  - components/canvas/DebugPanel.tsx
  - app/api/workflows/[slug]/presets/route.ts
---

## What this tests
A sandbox test payload (JSON body, headers, query params) can be saved as a named preset and later loaded back into the inputs by clicking the preset chip.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel; Sandbox tab is active

## Steps
1. Enter a JSON body in the Request Body input (e.g. `{"test": "hello"}`)
2. Click the `BookmarkPlus` "Save" button next to the "Request Body (JSON)" label
3. Type a preset name (e.g. "My Test") in the inline input that appears
4. Press Enter or click the "Save" button in the inline form
5. Verify the preset chip appears in the preset list above the body textarea
6. Clear the body textarea (or type different content)
7. Click the "My Test" preset chip
8. Verify the body textarea is restored to `{"test": "hello"}`

## Expected result
- Clicking `BookmarkPlus` shows an inline input (auto-focused) with placeholder "Preset name…" and Save/X buttons
- Pressing Enter or clicking Save: POSTs to `/api/workflows/[slug]/presets`, adds the new preset chip to the list, closes the inline form
- Preset chips render as `[name] [trash icon]` pairs; clicking the name loads the preset body/headers/query back into the inputs
- The loaded body is validated for JSON immediately (no error shown for valid JSON)
- If name is empty: error "Name is required" appears; form stays open
- Preset chip is prepended to the list (most recent first)

## Failure indicators
- Clicking BookmarkPlus does not reveal the inline save form
- Saving a preset does not create a chip in the preset list
- Clicking a preset chip does not restore the JSON body
- Error "Name is required" does not appear when saving without a name
- Preset disappears after page reload (should be persisted via API)

## Severity rationale
Presets save time during iterative testing; without them users must retype payloads repeatedly.

## Source reference
`components/canvas/DebugPanel.tsx` lines 429–456 — `handleSavePreset()` POSTs `{name, body, headers, query}` to `/api/workflows/${slug}/presets`, prepends result to `presets` state. Lines 465–470 — `handleLoadPreset()` sets `inputJson`, validates JSON, restores `headerRows`/`queryRows`. Lines 527–551 — preset chip list with load button and trash delete button.
