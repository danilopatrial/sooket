---
id: AUTH-03
title: Gate on — valid Bearer token grants access
severity: high
source_files:
  - proxy.ts
  - lib/security/auth.ts
---

## What this tests
With the gate enabled, a programmatic caller presenting
`Authorization: Bearer <SOOKET_AUTH_TOKEN>` is allowed through to the management
API.

## Prerequisites
- App running with `SOOKET_AUTH_TOKEN=<secret>`

## Steps
1. `curl -si -H "Authorization: Bearer <secret>" http://127.0.0.1:3000/api/workflows`
2. `curl -si -H "Authorization: Bearer wrong" http://127.0.0.1:3000/api/workflows`

## Expected result
- Correct token → `200` with the workflows array
- Wrong token → `401`

## Failure indicators
- A wrong token is accepted
- A correct token is rejected
- Comparison is case-insensitive on the token value (only the `Bearer` keyword is)

## Severity rationale
Programmatic access is the primary intended use of the gate; it must accept the
right secret and reject everything else.

## Source reference
`lib/security/auth.ts` — `isAuthorized()` strips the `Bearer ` prefix and compares
with constant-time `safeEqual()`.
