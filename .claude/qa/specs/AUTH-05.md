---
id: AUTH-05
title: /unlock with correct token sets the cookie and grants access
severity: critical
source_files:
  - app/api/unlock/route.ts
  - app/unlock/page.tsx
  - components/unlock/UnlockForm.tsx
---

## What this tests
Submitting the correct secret at `/unlock` sets the httpOnly `sooket_auth` cookie,
after which the browser can reach the dashboard and management API.

## Prerequisites
- App running with `SOOKET_AUTH_TOKEN=<secret>`

## Steps
1. `curl -si -c jar.txt -X POST http://127.0.0.1:3000/api/unlock -H "Content-Type: application/json" -d '{"token":"<secret>"}'`
2. `curl -si -b jar.txt http://127.0.0.1:3000/workflow`
3. `curl -si -b jar.txt http://127.0.0.1:3000/api/workflows`
4. (UI) open `/unlock`, enter the secret, submit

## Expected result
- Step 1 → `200` `{ok:true}` with `Set-Cookie: sooket_auth=...; HttpOnly; SameSite=lax`
- Steps 2–3 → `200` (no redirect / no 401)
- UI: after submit, the browser navigates to the `next` destination (default `/workflow`)

## Failure indicators
- Cookie is missing the `HttpOnly` attribute
- Dashboard still redirects to `/unlock` after a successful unlock
- The form does not navigate on success

## Severity rationale
This is the only browser path to authenticate; if it fails, the dashboard is
unusable when the gate is on.

## Source reference
`app/api/unlock/route.ts` — validates with `safeEqual()` and sets the
`AUTH_COOKIE` via `res.cookies.set({ httpOnly: true, sameSite: "lax", ... })`.
