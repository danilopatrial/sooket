---
id: ACCT-02
title: Generate or retrieve workspace management API key
severity: high
source_files:
  - app/(main)/account/page.tsx
  - app/api/account/api-key/route.ts
---

## What this tests
The General config tab (and the Account page indirectly) uses `POST /api/account/api-key` to generate the instance-level `sk-mw-*` management key on first call and return the existing one on subsequent calls.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow's General config tab (which auto-fetches the key on mount)

## Steps
1. Navigate to a workflow's General config tab
2. Observe the "Management API Key" section — the key loads automatically
3. Note the key value (first 12 chars visible after revealing)
4. Navigate away and return to the same tab
5. Verify the same key is shown (not a new one)
6. Use `curl -X POST http://localhost:3000/api/account/api-key` in the terminal to verify the response format

## Expected result
- First call: generates a new `sk-mw-[32 hex chars]` key, stores it in `settings` table under key `'api_key'`, returns `{api_key: "sk-mw-..."}`
- Subsequent calls: returns the same key (idempotent — existing key is returned without generating a new one)
- Key format: `sk-mw-` prefix followed by a UUID with hyphens removed (32 hex chars)

## Failure indicators
- `POST /api/account/api-key` returns an error or empty response
- A new key is generated on every call (non-idempotent)
- The key does not match `sk-mw-[a-f0-9]{32}` format

## Severity rationale
The management key is required to authenticate all management API calls; if generation fails, the REST API cannot be used programmatically.

## Source reference
`app/api/account/api-key/route.ts` lines 4–16 — POST: checks `settings` for existing `api_key`; if found returns it; otherwise generates `sk-mw-${crypto.randomUUID().replace(/-/g,"")}`, stores via `INSERT OR REPLACE`, returns it. `app/(main)/account/page.tsx` lines 10–11 — server component fetches the key via direct DB query to display masked value.
