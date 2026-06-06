---
id: CFG-GEN-07
title: Management API key — reveal and copy to clipboard
severity: high
source_files:
  - components/workflow-config/GeneralTab.tsx
  - app/api/account/api-key/route.ts
---

## What this tests
The "Management API Key" section in the General tab loads the instance-level `sk-mw-*` key, allows toggling its visibility (eye icon), and copies it to the clipboard with visual feedback.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the config General tab of any workflow

## Steps
1. Locate the "Management API Key" section with the amber warning box
2. Observe the key field — it should show `sk-mw-` followed by 24 bullet characters (`•`) while hidden
3. Observe the `Eye` icon button to the right of the key field
4. Click the `Eye` icon — verify the full key becomes visible
5. Click the `EyeOff` icon — verify the key is masked again
6. Click the `Copy` icon — verify a "Management key copied" toast appears and the copy icon briefly shows a `Check` (green)
7. Paste the clipboard contents elsewhere — verify it matches the full `sk-mw-*` key

## Expected result
- On mount: key field shows `sk-mw-${"•".repeat(24)}` while `keyVisible = false`; shows "Loading…" until the API call completes
- Eye icon (`Eye` when hidden, `EyeOff` when visible) toggles `keyVisible`; both the icon and the key display update
- Copy icon (`Copy` → `Check` for 2 seconds): copies `mgmtKey` to clipboard, shows "Management key copied" toast
- Both eye and copy buttons are disabled (`opacity-40`) while the key is still loading

## Failure indicators
- The key field stays on "Loading…" indefinitely
- The `Eye` icon has no effect (key stays masked)
- Clicking `Copy` does not change the icon to `Check` or show a toast
- Pasting the clipboard shows an empty or incorrect value

## Severity rationale
The management key is needed to use the REST management API; if it cannot be revealed or copied, users cannot authenticate management calls.

## Source reference
`components/workflow-config/GeneralTab.tsx` lines 52–57 — `useEffect` POSTs to `/api/account/api-key` to fetch/generate `mgmtKey`. Lines 59–65 — `handleCopy()` writes to clipboard, sets `copied=true` for 2s, toasts. Lines 166–188 — key display masked with bullets when `!keyVisible`; Eye/EyeOff toggles `keyVisible`; Copy/Check icon based on `copied` state.
