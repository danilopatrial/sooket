---
id: CFG-KEY-02
title: Create a new API key with a label
severity: high
source_files:
  - components/workflow-config/ApiKeysTab.tsx
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
The "Create New Key" form in the API Keys tab accepts a label, POSTs to the API, adds the new key to the list, and shows a one-time reveal banner with the full key value.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab

## Steps
1. Locate the "Create New Key" form at the top of the tab
2. Enter a label (e.g. "my-integration") in the Label field
3. Observe the scope shown: "EXECUTE" (fixed, cannot be changed)
4. Leave "Expires" empty for now
5. Click "Create key"
6. Observe the result

## Expected result
- While creating: button shows "Creating…" and is disabled
- On success: a green one-time reveal banner appears at the top of the tab ("Key created — save it now") with the full `sk-wf-*` value, an eye (reveal) toggle, and a copy button
- A toast "Key '[label]' created" appears
- The new key appears in the key list below (with masked `key_hint`, scope "EXECUTE", label, last-used "Never")
- The label input and expires field are cleared after creation
- The Create key button is disabled when the label is empty

## Failure indicators
- Clicking "Create key" with a label has no effect
- No reveal banner appears after creation
- The key list does not update with the new key
- The "Creating…" loading state is not shown
- The button is not disabled when label is empty

## Severity rationale
Creating API keys is how callers are granted access to the workflow; a broken create flow leaves the workflow uncallable.

## Source reference
`components/workflow-config/ApiKeysTab.tsx` lines 135–162 — `handleCreate()` POSTs `{label, scopes: ["execute"], expires_at?}`, sets `newKey` state (shows reveal banner), appends to `keys` list, clears form. Lines 252–259 — submit button disabled when `creating || !label.trim()`. Lines 54–103 — `NewKeyReveal` component shows full key with reveal/copy.
