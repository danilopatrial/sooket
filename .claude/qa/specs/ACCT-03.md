---
id: ACCT-03
title: Copy management API key to clipboard from General config tab
severity: medium
source_files:
  - components/workflow-config/GeneralTab.tsx
  - app/api/account/api-key/route.ts
---

## What this tests
The `Copy` icon button next to the management API key in the General config tab writes the full key value to the clipboard and shows a `Check` icon with a success toast for 2 seconds.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow's General config tab
- Management API key has loaded (not "Loading…")

## Steps
1. Locate the Management API Key section
2. Click the `Copy` icon button (right of the key display)
3. Observe the icon and toast
4. Paste the clipboard value in a text editor or terminal — verify it matches `sk-mw-[32 hex chars]`

## Expected result
- Clicking `Copy`: calls `navigator.clipboard.writeText(mgmtKey)`; icon changes from `Copy` to `Check` (green `text-emerald-500`) for 2 seconds; toast "Management key copied" appears
- After 2 seconds: icon reverts to `Copy`
- Pasting the clipboard reveals the full unmasked `sk-mw-*` key

## Failure indicators
- Clicking `Copy` has no effect (icon does not change)
- No toast appears after copying
- The `Check` icon does not revert to `Copy` after 2 seconds
- Pasted value is empty or masked (`••••••••`) instead of the full key

## Severity rationale
Clipboard copy is the primary way users retrieve the management key for API scripts; if it fails, users must manually reveal and transcribe a 38-character string.

## Source reference
`components/workflow-config/GeneralTab.tsx` lines 59–65 — `handleCopy()`: `navigator.clipboard.writeText(mgmtKey)`, sets `copied=true`, toasts "Management key copied", resets `copied` after 2000ms. Lines 180–186 — Copy button shows `Check` when `copied=true`, `Copy` otherwise; disabled when `!mgmtKey`.
