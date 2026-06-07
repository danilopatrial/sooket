---
id: AUTH-07
title: Public paths stay reachable when the gate is on
severity: critical
source_files:
  - lib/security/auth.ts
  - proxy.ts
---

## What this tests
Even with the gate enabled, the exempt paths remain reachable without the gate
token, because they carry their own auth or must stay public.

## Prerequisites
- App running with `SOOKET_AUTH_TOKEN=<secret>`

## Steps
1. `curl -si http://127.0.0.1:3000/api/health`
2. `curl -si -X POST http://127.0.0.1:3000/api/v1/chat -d '{}'`
3. `curl -si -X POST http://127.0.0.1:3000/api/webhooks/<slug>`
4. `curl -si http://127.0.0.1:3000/unlock`
5. `curl -si -H "Authorization: Bearer <sk-mw-key>" http://127.0.0.1:3000/api/admin/backup`

## Expected result
- None of these return the gate's `{"error":"Authentication required"}` 401.
- `/api/health` → 200; `/unlock` → 200 HTML.
- `/api/v1/chat`, `/api/webhooks/*`, `/api/admin/backup` reach their own auth
  (e.g. `/api/v1/chat` → 401 `Missing Authorization header`; backup with a valid
  `sk-mw-*` → 200 download).

## Failure indicators
- Any exempt path returns the gate 401 `Authentication required`
- `/api/admin/backup` becomes unreachable with a valid `sk-mw-*` key (the original
  header-collision bug)

## Severity rationale
A mis-scoped exemption either breaks the execution surface or re-opens the gate.

## Source reference
`lib/security/auth.ts` — `isPublicPath()` lists `/api/health`, `/api/v1/*`,
`/api/webhooks/*`, `/api/admin/backup`, `/unlock`, `/api/unlock`.
