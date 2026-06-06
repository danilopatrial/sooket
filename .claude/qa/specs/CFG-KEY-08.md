---
id: CFG-KEY-08
title: Newly created key shown once in one-time reveal banner
severity: high
source_files:
  - components/workflow-config/ApiKeysTab.tsx
---

## What this tests
Immediately after creating an API key, a green one-time reveal banner appears at the top of the tab showing the full `sk-wf-*` value with an eye toggle and copy button; dismissing the banner removes it permanently (the value is never retrievable again from the UI).

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab

## Steps
1. Create a new API key (enter a label, click "Create key")
2. Observe the top of the tab for a green banner
3. Verify the banner shows a masked key by default (`sk-wf-` followed by 28 bullet characters)
4. Click the `Eye` icon — verify the full key is revealed
5. Click `EyeOff` — verify it is masked again
6. Click the `Copy` icon — verify a "API key copied" toast appears and the icon briefly shows `Check`
7. Click "I have saved it — dismiss"
8. Verify the banner disappears and does not reappear on page reload

## Expected result
- Green banner (`border-emerald-500/40 bg-emerald-500/10`) with `AlertTriangle` icon and text "Key created — save it now" / "This is the only time you will see this key."
- Key display: masked as `sk-wf-${"•".repeat(28)}` by default; full key shown when `Eye` is clicked
- `Copy` button copies the full key to clipboard, shows `Check` icon for 2 seconds, toasts "API key copied"
- "I have saved it — dismiss" link sets `newKey` to null, hiding the banner
- After dismissal or page reload: only `key_hint` (masked) is visible in the key list; the full key is gone

## Failure indicators
- No green banner appears after key creation
- The banner shows the masked value only (Eye toggle has no effect)
- Copying does not work or shows no feedback
- Banner persists after clicking "I have saved it — dismiss"
- The full key is shown again on page reload (would be a security issue)

## Severity rationale
The one-time reveal is a security design: the full key is only transmitted during creation; missing this banner means the user cannot retrieve the key they just created.

## Source reference
`components/workflow-config/ApiKeysTab.tsx` lines 54–103 — `NewKeyReveal` component: eye toggle (`visible` state), copy handler writes to clipboard and shows `Check` for 2s; dismiss calls `onDismiss`. Lines 150–153 — on successful POST: `setNewKey(key)` (triggers banner), appends masked version to `keys` list.
