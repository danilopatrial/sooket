---
id: CFG-PROV-03
title: Remove a provider key
severity: medium
source_files:
  - components/workflow-config/ProviderKeysTab.tsx
  - app/api/workflows/[slug]/provider-keys/route.ts
---

## What this tests
When a provider key is configured, a "Remove key" button appears; clicking it sends a DELETE request and reverts the card to the "Not set" state.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Provider Keys tab
- An Anthropic provider key is already configured (`hasKey = true`)

## Steps
1. Locate the "Remove key" button in the Anthropic card (appears only when configured)
2. Click "Remove key"
3. Observe the result

## Expected result
- While removing: button shows "Removing…" and is disabled
- On success: toast "Anthropic key removed"; `hasKey` set to `false`; badge reverts to muted "Not set"; masked key placeholder disappears; button label reverts to "Save key"; "Remove key" button disappears
- On error: toast "Failed to remove key"
- The `DELETE /api/workflows/${slug}/provider-keys?provider=anthropic` request deletes the row from `workflow_provider_keys`

## Failure indicators
- "Remove key" button is absent when a key is configured
- Clicking "Remove key" has no effect
- Badge remains "Configured" after successful removal
- The "Remove key" button remains visible after removal (should disappear when `hasKey=false`)

## Severity rationale
Removing a provider key allows switching to a different key or reverting to the global key; if removal fails, the workflow is stuck with a potentially invalid key.

## Source reference
`components/workflow-config/ProviderKeysTab.tsx` lines 38–50 — `handleRemove()` calls `DELETE /api/workflows/${slug}/provider-keys?provider=anthropic`, on success toasts and sets `hasKey=false`. Lines 106–115 — "Remove key" button conditionally rendered only when `hasKey` is true. `app/api/workflows/[slug]/provider-keys/route.ts` lines 33–49 — DELETE handler removes row from `workflow_provider_keys`.
