---
id: AUTH-10
title: Unlock cookie Secure flag matches the bind host
severity: medium
source_files:
  - app/api/unlock/route.ts
  - lib/security/auth.ts
---

## What this tests
The `sooket_auth` cookie is marked `Secure` when the server is bound to a
non-loopback host, but not on loopback (so it still works over plain http on
localhost).

## Prerequisites
- App running with `SOOKET_AUTH_TOKEN=<secret>`

## Steps
1. Loopback (`SOOKET_HOST` unset): `POST /api/unlock` with the correct token; inspect `Set-Cookie`
2. Exposed (`SOOKET_HOST=0.0.0.0`): same request; inspect `Set-Cookie`

## Expected result
- Loopback → cookie has `HttpOnly; SameSite=lax` and **no** `Secure`
- Exposed → cookie additionally has `Secure`

## Failure indicators
- `Secure` set on loopback (cookie silently dropped over http → unusable)
- `Secure` missing when exposed (cookie sent over plaintext)

## Severity rationale
Wrong Secure handling either breaks local unlock or leaks the cookie over
plaintext on an exposed deployment.

## Source reference
`app/api/unlock/route.ts` — `secure: !isLoopbackHost(resolveHost())`.
