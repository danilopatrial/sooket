---
id: NAV-01
title: Root URL redirects to /workflow
severity: high
source_files:
  - app/(main)/page.tsx
---

## What this tests
Visiting the root URL (`/`) performs a server-side redirect to `/workflow`.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Open a browser and navigate to `http://localhost:3000/`
2. Observe the final URL in the address bar after page load

## Expected result
The browser lands on `http://localhost:3000/workflow` (or a slug sub-path if a workflow already exists) with a 307 temporary redirect. The root URL `/` is never the resting URL.

## Failure indicators
- The browser stays at `http://localhost:3000/` and renders a page (no redirect occurred)
- A 404 or blank page is shown at `http://localhost:3000/`
- The address bar shows any URL other than a `/workflow` path after load

## Severity rationale
Root redirect is the primary entry point; failure means the app is unreachable via its base URL.

## Source reference
`app/(main)/page.tsx` — calls `redirect("/workflow")` from `next/navigation`, producing a server-side redirect before any HTML is sent to the client.

## Notes
The redirect is implemented as a Next.js server component using `redirect()`, so no client-side navigation is involved. It fires before the layout renders.
