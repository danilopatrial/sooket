---
id: CFG-KEY-01
title: API Keys tab lists existing keys with masked values
severity: high
source_files:
  - components/workflow-config/ApiKeysTab.tsx
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
The API Keys tab loads and displays all existing API keys, each showing label, masked key value (first 10 + "..." + last 4 chars), scopes badge, last-used time, and active/inactive state.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab
- At least one API key exists (a "Default Key" is auto-created with every new workflow)

## Steps
1. Open the API Keys config tab
2. Observe the list of API key rows
3. Verify each row shows: label, masked key value, scope badge, last-used time
4. Verify the masked key format is `[first 10 chars]...[last 4 chars]` (e.g. `sk-wf-abc1...xyz9`)

## Expected result
- API keys are loaded via `GET /api/workflows/[slug]/api-keys`
- Each key row displays:
  - Label text
  - `key_hint` — masked value using `maskKey()`: `key.slice(0,10) + "..." + key.slice(-4)` (only if key length > 10)
  - Scope badges (e.g. "EXECUTE") in sky-blue styling
  - Last used time via `relativeTime()` (e.g. "Never", "5m ago", "2d ago")
  - Active/inactive toggle icon
- The full key value is never included in the list response

## Failure indicators
- No key rows appear even when keys exist
- Full key values are shown in the list (not masked)
- Scope badges are absent
- Last-used time shows raw ISO timestamps instead of relative format

## Severity rationale
API key listing is how users manage access credentials; showing unmasked keys would be a security issue; not showing keys makes management impossible.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` lines 15–18 — `maskKey()`: returns first 10 + `"..."` + last 4 chars; applied to every key in the GET response as `key_hint`. Lines 35–45 — GET returns `{id, label, key_hint, scopes, rate_limit_override, expires_at, last_used_at, is_active, created_at}`. `components/workflow-config/ApiKeysTab.tsx` lines 26–37 — `relativeTime()` formats last-used timestamp.
