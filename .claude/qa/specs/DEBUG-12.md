---
id: DEBUG-12
title: JSON body is validated before sending — invalid JSON shows an error
severity: medium
source_files:
  - components/canvas/DebugPanel.tsx
---

## What this tests
The Request Body textarea in the Sandbox tab validates its content as JSON on every keystroke; an inline error message appears for invalid JSON and the Run button is blocked from sending.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel; Sandbox tab is active

## Steps
1. Click into the Request Body textarea
2. Type invalid JSON (e.g. `{bad json`)
3. Observe the textarea border and the area below it
4. Attempt to click the Run button
5. Fix the JSON to be valid (e.g. `{"key": "value"}`)
6. Observe the error clears and the Run button becomes usable

## Expected result
- While the textarea contains invalid JSON: the border changes to red (`border-red-500/40`), and the parse error message appears below the textarea in `text-xs text-red-400`
- Clicking Run with `jsonError` set: `handleRun()` returns immediately without making a fetch request (`if (jsonError) return`)
- After fixing the JSON: the error message disappears, border returns to normal (`border-white/[0.08]`), and Run works again
- Empty body (`""`) is treated as valid (no error shown); an empty string skips JSON parsing and sends `body = {}`

## Failure indicators
- Invalid JSON in the body textarea shows no error message
- The Run button fires a request despite invalid JSON being present
- A valid JSON body shows a false-positive error
- The error message does not clear after fixing the JSON

## Severity rationale
Sending malformed JSON would cause a confusing 400 error from the API; inline validation gives immediate feedback and prevents the round-trip.

## Source reference
`components/canvas/DebugPanel.tsx` lines 390–394 — `validateJson()` tries `JSON.parse(text)` and sets `jsonError` to the parse error message on failure, or clears it on success; empty text clears the error. Line 556 — `onChange` calls `validateJson` on every keystroke. Lines 397–398 — `handleRun()` returns early if `jsonError` is truthy. Lines 558–561 — textarea `className` switches border to `border-red-500/40` when `jsonError` is set. Line 565 — error text rendered below textarea.
