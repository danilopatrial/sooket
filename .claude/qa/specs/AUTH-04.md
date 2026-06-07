---
id: AUTH-04
title: Gate on — browser navigation without cookie redirects to /unlock
severity: medium
source_files:
  - proxy.ts
---

## What this tests
With the gate enabled, a browser navigation (non-API path) without a valid
`sooket_auth` cookie is redirected to the unlock screen, preserving the intended
destination in `?next=`.

## Prerequisites
- App running with `SOOKET_AUTH_TOKEN=<secret>`
- No `sooket_auth` cookie present

## Steps
1. `curl -si http://127.0.0.1:3000/workflow`
2. Inspect the `Location` header

## Expected result
- HTTP `307` redirect to `/unlock?next=%2Fworkflow`
- The original path is URL-encoded into the `next` query param

## Failure indicators
- The dashboard renders without unlocking
- Redirect target is not `/unlock`, or `next` is missing/duplicated

## Severity rationale
Without the redirect, a locked-out operator has no path to authenticate in the
browser.

## Source reference
`proxy.ts` — non-API gated paths return `NextResponse.redirect` to `/unlock` with
`next` set to the requested pathname.
