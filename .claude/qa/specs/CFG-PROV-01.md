---
id: CFG-PROV-01
title: Provider key shows Configured badge when set
severity: medium
source_files:
  - components/workflow-config/ProviderKeysTab.tsx
---

## What this tests
The Anthropic provider key card in the Provider Keys tab shows a green "Configured" badge when a key is stored, and a muted "Not set" badge when no key exists.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Provider Keys tab

## Steps
1. Observe the "Anthropic" card — note the badge in the top-right corner
2. If no key is set: verify the badge reads "Not set" in muted styling
3. Save an Anthropic key (see CFG-PROV-02), then observe the badge
4. Verify the badge now reads "Configured" in green

## Expected result
- When `hasKey = false`: badge shows "NOT SET" in muted style (`bg-muted text-muted-foreground border-border`)
- When `hasKey = true`: badge shows "CONFIGURED" in emerald green style (`bg-emerald-500/15 text-emerald-400 border-emerald-500/30`)
- Badge text is uppercase (`uppercase tracking-wider`)
- When configured: a masked key placeholder `sk-ant-••••••••••••••••••••••` is shown in a monospace code box below the badge

## Failure indicators
- Badge is absent regardless of key state
- Badge shows "Configured" when no key is set
- Badge shows "Not set" after a key has been saved
- The masked key placeholder does not appear when configured

## Severity rationale
The badge is the primary visual indicator of whether the Anthropic node will have a key at runtime; incorrect state misleads debugging of auth failures.

## Source reference
`components/workflow-config/ProviderKeysTab.tsx` lines 75–81 — badge renders with `hasKey ? "Configured" : "Not set"` and conditional CSS classes. Lines 84–88 — masked key placeholder `sk-ant-••••••••••••••••••••••` is rendered only when `hasKey` is true.
