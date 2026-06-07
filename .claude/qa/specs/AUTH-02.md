---
id: AUTH-02
title: Gate on — management API without auth returns 401
severity: critical
source_files:
  - proxy.ts
  - lib/security/auth.ts
---

## What this tests
When `SOOKET_AUTH_TOKEN` is set, an unauthenticated request to a gated management
route is rejected with a JSON 401 before the route runs.

## Prerequisites
- App running with `SOOKET_AUTH_TOKEN=<secret>`

## Steps
1. `curl -si http://127.0.0.1:3000/api/workflows`
2. Repeat for `/api/credentials`, `/api/account/api-key`, `/api/workflows/<slug>/api-keys`

## Expected result
- HTTP `401` with body `{"error":"Authentication required"}`
- No workflow/credential data is returned

## Failure indicators
- Any gated route returns `200` without a credential
- The response leaks data before the gate check

## Severity rationale
This is the core protection — the management surface (including key minting) must
be sealed when the gate is enabled.

## Source reference
`proxy.ts` — for non-public API paths, returns
`NextResponse.json({ error: "Authentication required" }, { status: 401 })` when
`isAuthorized()` is false.
