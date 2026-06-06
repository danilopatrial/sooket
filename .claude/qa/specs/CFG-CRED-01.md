---
id: CFG-CRED-01
title: Credentials tab lists global credential pool
severity: medium
source_files:
  - components/workflow-config/CredentialsTab.tsx
  - app/api/credentials/route.ts
---

## What this tests
The "Credentials Pool" section of the Credentials tab loads and displays all globally-defined credentials (name and type), with a delete button on each row.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Credentials tab
- At least one credential exists in the pool

## Steps
1. Open the Credentials config tab
2. Observe the "Credentials Pool" section at the top
3. Verify each credential row shows a `KeyRound` icon, credential name, and type

## Expected result
- Credentials are fetched via `GET /api/credentials` on mount
- Each credential row displays: `KeyRound` icon, credential name (`text-sm font-medium`), and type (`text-xs text-muted-foreground`) below it
- A `Trash2` delete button appears on the right of each row
- Empty state: "No credentials yet. Add one to share API keys across workflows." in a dashed border box
- Secret values are never shown in the list (only name and type)

## Failure indicators
- No credential rows appear even when credentials exist
- Credential secret values are visible in the list
- The delete button is absent from credential rows
- "Loading…" persists indefinitely

## Severity rationale
The credential pool is a shared store for API keys across workflows; if listing fails, users cannot manage or assign credentials.

## Source reference
`components/workflow-config/CredentialsTab.tsx` lines 67–68 — fetches `GET /api/credentials` and `GET /api/workflows/${slug}/credentials` in parallel. Lines 215–241 — renders each credential as a row with name, type, and `Trash2` delete button; empty state shown when `credentials.length === 0`. `app/api/credentials/route.ts` lines 7–9 — GET returns `adapter.listCredentials()` (names and types only, no secrets).
