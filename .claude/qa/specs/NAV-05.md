---
id: NAV-05
title: Unknown routes return a 404 page
severity: low
source_files:
  - app/workflow/[slug]/page.tsx
  - next.config.ts
---

## What this tests
Navigating to an undefined route returns a 404 response and renders a not-found page rather than crashing or hanging.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Navigate to `http://localhost:3000/does-not-exist`
2. Observe the HTTP status code (via browser DevTools → Network tab) and the rendered page
3. Navigate to `http://localhost:3000/workflow/nonexistent-slug-abc123`
4. Observe the HTTP status code and rendered page

## Expected result
- Both URLs return HTTP 404
- A not-found page is rendered (Next.js default: "404 | This page could not be found." or any custom not-found UI if added)
- No unhandled error, blank page, or 500 response is shown

## Failure indicators
- A 500 error or unhandled exception page is shown
- The page hangs or returns no response
- HTTP status code is 200 on a clearly missing route
- A blank white page with no content is displayed

## Severity rationale
404 handling is a baseline correctness requirement; a crash or 500 on unknown routes would indicate broken error boundaries.

## Source reference
`app/workflow/[slug]/page.tsx` — calls `notFound()` from `next/navigation` when the slug does not match any workflow in the database, triggering Next.js's 404 handling. No custom `not-found.tsx` is present in the project; the framework default applies.

## Notes
No custom `not-found.tsx` file exists in the app directory as of this review. Next.js App Router will render its built-in "404 | This page could not be found." page. If a custom not-found page is added in future, update this spec to reference its exact UI text.
