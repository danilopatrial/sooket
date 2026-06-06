---
id: VARFIELD-05
title: Arrow keys navigate suggestions; Enter/Tab inserts; Esc dismisses
severity: medium
source_files:
  - components/canvas/VarField.tsx
---

## What this tests
When the autocomplete suggestion dropdown is open in a VarField, ArrowDown/ArrowUp move the highlighted item; Enter or Tab inserts the selected suggestion replacing the partial text; Esc closes the dropdown without inserting.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas with a VarField node
- At least two customer variables exist (so navigation can move between them)

## Steps
1. Open a VarField and type `$` to trigger the suggestion dropdown with multiple items
2. Press ArrowDown — verify the second item becomes highlighted
3. Press ArrowDown again until the last item — verify it does not scroll past the last item
4. Press ArrowUp — verify selection moves back up
5. Navigate to a specific suggestion and press Enter — verify it is inserted into the field, replacing the `$partial` text
6. Trigger the dropdown again and press Tab — verify the selected suggestion is inserted
7. Trigger the dropdown again and press Esc — verify the dropdown closes without inserting anything

## Expected result
- ArrowDown: `selectedIdx` increments, clamped to `suggestions.length - 1`
- ArrowUp: `selectedIdx` decrements, clamped to `0`
- Enter or Tab: calls `insertSuggestion(suggestions[selectedIdx])`; the `$partial` text is replaced with the full `$VAR_NAME`; cursor positioned after the inserted text; dropdown closes
- Esc: `setSuggestions([])` — dropdown closes, typed text remains unchanged
- All four keys call `e.preventDefault()` to suppress default browser behavior

## Failure indicators
- Arrow keys do not move the highlighted item
- Enter inserts the wrong suggestion (not the highlighted one)
- Tab inserts a tab character instead of the suggestion
- Esc does not close the dropdown
- After insertion, the cursor is not positioned after the inserted text

## Severity rationale
Keyboard navigation is the primary way to use the autocomplete efficiently; mouse-click is secondary; broken keyboard interaction forces mouse use for every suggestion.

## Source reference
`components/canvas/VarField.tsx` lines 223–239 — `handleKeyDown()`: ArrowDown increments `selectedIdx` (min with `suggestions.length - 1`); ArrowUp decrements (max with 0); Enter/Tab calls `insertSuggestion(suggestions[selectedIdx])`; Escape calls `setSuggestions([])`. Each key calls `e.preventDefault()`. Lines 174–193 — `insertVar()`: replaces partial match and repositions cursor via `requestAnimationFrame`.
