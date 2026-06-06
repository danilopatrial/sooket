---
id: NAV-02
title: Login page redirects to /workflow
severity: medium
source_files:
  - app/(main)/(auth)/login/page.tsx
---

## What this tests
Visiting `/login` performs a server-side redirect to `/workflow` (no authentication UI is rendered).

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Navigate to `http://localhost:3000/login`
2. Observe the final URL in the address bar after page load

## Expected result
The browser lands at `http://localhost:3000/workflow`. No login form or authentication UI is rendered; the page behaves identically to visiting `/workflow` directly.

## Failure indicators
- A login form, username/password fields, or any authentication UI is rendered at `/login`
- The browser stays at `/login` without redirecting
- A 404 or error page appears at `/login`

## Severity rationale
The app is local-only with no authentication; if `/login` renders a form, users may expect auth that doesn't exist, causing confusion.

## Source reference
`app/(main)/(auth)/login/page.tsx` — calls `redirect("/workflow")` from `next/navigation` with no rendered JSX.

## Notes
This is intentional by design: Sooket runs in local-only mode with no login/register flow. The route exists to gracefully redirect any bookmarked or linked `/login` URLs.
