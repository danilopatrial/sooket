---
id: NAV-03
title: Register page redirects to /workflow
severity: medium
source_files:
  - app/(main)/(auth)/register/page.tsx
---

## What this tests
Visiting `/register` performs a server-side redirect to `/workflow` (no registration UI is rendered).

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Navigate to `http://localhost:3000/register`
2. Observe the final URL in the address bar after page load

## Expected result
The browser lands at `http://localhost:3000/workflow`. No registration form, username/password fields, or any sign-up UI is rendered.

## Failure indicators
- A registration/sign-up form is rendered at `/register`
- The browser stays at `/register` without redirecting
- A 404 or error page appears at `/register`

## Severity rationale
The app is local-only with no authentication; rendering a register form would mislead users into expecting functionality that does not exist.

## Source reference
`app/(main)/(auth)/register/page.tsx` — calls `redirect("/workflow")` from `next/navigation` with no rendered JSX.

## Notes
Parallel to NAV-02 (login redirect). Both auth routes are intentional stubs that redirect away immediately, reflecting Sooket's local-only, no-authentication design.
