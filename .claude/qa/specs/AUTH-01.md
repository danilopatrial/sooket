---
id: AUTH-01
title: Gate disabled by default — management API and dashboard are open
severity: high
source_files:
  - proxy.ts
  - lib/security/auth.ts
---

## What this tests
With `SOOKET_AUTH_TOKEN` unset (the default), the shared-secret gate is inert and
the app behaves exactly as before: the management API and dashboard are reachable
without any credential.

## Prerequisites
- App running with **no** `SOOKET_AUTH_TOKEN` in the environment
- Bound to loopback (default)

## Steps
1. `curl -si http://127.0.0.1:3000/api/workflows`
2. `curl -si http://127.0.0.1:3000/workflow`

## Expected result
- `GET /api/workflows` → `200` with the workflows array (no auth required)
- `GET /workflow` → `200`, no redirect to `/unlock`

## Failure indicators
- Either request returns `401` or redirects to `/unlock` while the token is unset
- The proxy alters headers/behavior when the gate is disabled

## Severity rationale
The gate must be strictly opt-in; a regression here would break every default
local install.

## Source reference
`proxy.ts` — `resolveAuthToken()` returns null when unset, so `proxy()` returns
`NextResponse.next()` immediately.
