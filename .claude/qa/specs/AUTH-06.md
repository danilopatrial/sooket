---
id: AUTH-06
title: /unlock rejects wrong/missing tokens; 400 when gate disabled
severity: high
source_files:
  - app/api/unlock/route.ts
---

## What this tests
The unlock endpoint rejects invalid input and refuses to operate when the gate is
not enabled.

## Prerequisites
- For 401 cases: `SOOKET_AUTH_TOKEN=<secret>` set
- For the 400 case: `SOOKET_AUTH_TOKEN` unset

## Steps
1. Gate on, wrong token: `POST /api/unlock` `{"token":"wrong"}`
2. Gate on, missing token: `POST /api/unlock` `{}`
3. Gate on, non-string token: `POST /api/unlock` `{"token":123}`
4. Gate on, malformed body: `POST /api/unlock` with `not-json`
5. Gate off: `POST /api/unlock` `{"token":"anything"}`

## Expected result
- Cases 1–3 → `401` `{error:"Invalid token"}`, no `Set-Cookie`
- Case 4 → `400` (invalid request body)
- Case 5 → `400` `{error:"Authentication is not enabled on this instance."}`

## Failure indicators
- Any invalid token yields a `Set-Cookie`
- A non-string/missing token throws a 500 instead of 401
- Unlock succeeds while the gate is disabled

## Severity rationale
A weak unlock validator would undermine the entire gate.

## Source reference
`app/api/unlock/route.ts` — early `400` when `resolveAuthToken()` is null; JSON
parse guard; `typeof token !== "string" || !safeEqual(...)` → 401.
