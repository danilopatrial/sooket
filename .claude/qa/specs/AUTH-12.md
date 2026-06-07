---
id: AUTH-12
title: Admin backup — constant-time auth and gate exemption
severity: critical
source_files:
  - app/api/admin/backup/route.ts
  - lib/security/auth.ts
---

## What this tests
`GET /api/admin/backup` compares the management key in constant time and remains
reachable with a valid `sk-mw-*` key even when the shared-secret gate is on
(the route is gate-exempt to avoid an `Authorization` header collision).

## Prerequisites
- A management key configured (`POST /api/account/api-key` while gate is off, or seeded)
- Re-run with `SOOKET_AUTH_TOKEN` set

## Steps
1. Gate off — valid key: `curl -si -H "Authorization: Bearer <sk-mw-key>" /api/admin/backup`
2. Gate off — wrong/absent key → 401
3. Gate **on** (`SOOKET_AUTH_TOKEN=<secret>`) — valid `sk-mw-*` key, **no** gate token:
   `curl -si -H "Authorization: Bearer <sk-mw-key>" /api/admin/backup`

## Expected result
- Steps 1 and 3 → `200`, `application/octet-stream`, `Content-Disposition` attachment
- Step 2 → `401` `{error:"Invalid or missing management key"}`
- Step 3 is the regression guard: the gate must NOT intercept backup and 401 it

## Failure indicators
- Step 3 returns the gate's `{"error":"Authentication required"}` (header collision regression)
- Wrong key accepted; timing-unsafe comparison reintroduced (`!==`)

## Severity rationale
Backup exports the entire database; both an auth bypass and an accidental lockout
of the legitimate operator are serious.

## Source reference
`app/api/admin/backup/route.ts` — `safeEqual(token, mgmtKey)`;
`lib/security/auth.ts` — `/api/admin/backup` listed in `isPublicPath()`.
