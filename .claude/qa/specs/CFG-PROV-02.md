---
id: CFG-PROV-02
title: Add or update a provider key via password field and save
severity: high
source_files:
  - components/workflow-config/ProviderKeysTab.tsx
  - app/api/workflows/[slug]/provider-keys/route.ts
---

## What this tests
The Anthropic provider key card has a password input and a "Save key" / "Replace key" button; entering a key and saving POSTs it (encrypted) to the API and updates the card to show the "Configured" badge.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Provider Keys tab

## Steps
1. Locate the password input in the Anthropic card (placeholder: "sk-ant-…" when not set, "Enter new key to replace…" when already configured)
2. Type an Anthropic API key (format: `sk-ant-…`)
3. Click the "Save key" button (or "Replace key" if a key already exists)
4. Observe the result

## Expected result
- While saving: button shows "Saving…" and is disabled; input is still visible
- On success: toast "Anthropic key saved"; `hasKey` set to `true`; badge changes to green "Configured"; input is cleared; masked key placeholder `sk-ant-••••••••••••••••••••••` appears; button label changes to "Replace key"
- The key is stored AES-encrypted via `encrypt(key.trim(), SECRET)` with upsert semantics (`ON CONFLICT DO UPDATE`) — saving again replaces the previous key
- "Save key" / "Replace key" button is disabled when the input is empty

## Failure indicators
- Clicking save has no effect
- "Saving…" loading state is not shown
- Badge does not change to "Configured" after a successful save
- The input is not cleared after saving
- "Save" is clickable when input is empty

## Severity rationale
Provider key storage is required for the Anthropic node to make API calls; if saving fails, the node cannot execute.

## Source reference
`components/workflow-config/ProviderKeysTab.tsx` lines 18–36 — `handleSave()` POSTs `{provider: "anthropic", key: keyInput.trim()}`, on success clears input and sets `hasKey=true`. Lines 100–105 — submit button disabled when `saving || !keyInput.trim()`; label toggles between "Save key" and "Replace key" based on `hasKey`. `app/api/workflows/[slug]/provider-keys/route.ts` lines 22–28 — encrypts key, upserts into `workflow_provider_keys`.
