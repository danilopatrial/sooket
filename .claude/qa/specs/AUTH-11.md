---
id: AUTH-11
title: /unlock open-redirect protection on the `next` param
severity: medium
source_files:
  - app/unlock/page.tsx
---

## What this tests
The unlock page only honors same-origin relative destinations in `?next=`,
falling back to `/workflow` for anything that could redirect off-site.

## Prerequisites
- App running with `SOOKET_AUTH_TOKEN=<secret>`

## Steps
1. Open `/unlock?next=https://evil.example` and unlock
2. Open `/unlock?next=//evil.example` and unlock
3. Open `/unlock?next=/workflow/abc` and unlock

## Expected result
- Cases 1–2 → navigation goes to `/workflow` (the unsafe target is ignored)
- Case 3 → navigation goes to `/workflow/abc`

## Failure indicators
- The browser is sent to an external origin after unlock
- A protocol-relative `//host` value is accepted

## Severity rationale
An open redirect on the auth screen is a phishing vector.

## Source reference
`app/unlock/page.tsx` — `dest = next.startsWith("/") && !next.startsWith("//") ? next : "/workflow"`.
