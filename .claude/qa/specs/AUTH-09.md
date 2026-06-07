---
id: AUTH-09
title: Exposure warning on non-loopback bind without a token
severity: medium
source_files:
  - lib/security/auth.ts
  - instrumentation.ts
  - server/index.ts
---

## What this tests
On startup, Sooket prints a loud security warning when it is bound to a
non-loopback interface without `SOOKET_AUTH_TOKEN`, and stays silent for the safe
configurations.

## Prerequisites
- Ability to start the Next app and the standalone execution server with custom env

## Steps
1. Exposed, no token: `SOOKET_HOST=0.0.0.0 npm start` (and `npm run execution-server`)
2. Loopback, no token: `npm start` with `SOOKET_HOST` unset
3. Exposed, with token: `SOOKET_HOST=0.0.0.0 SOOKET_AUTH_TOKEN=secret npm start`

## Expected result
- Case 1 → a banner containing `SECURITY WARNING — Sooket is exposed without authentication`
- Cases 2 and 3 → no such banner

## Failure indicators
- No warning when exposed without a token
- Warning printed on loopback or when a token is set (false alarm)

## Severity rationale
The warning is the safety net against the most likely misconfiguration
(widening the bind address and forgetting auth).

## Source reference
`lib/security/auth.ts` — `warnIfExposedWithoutAuth()`; wired into
`instrumentation.ts` (Next) and `server/index.ts` (execution server).
