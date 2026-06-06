---
id: CONTRACT-WF-02
title: POST /api/workflows returns {slug} with a 10-char nanoid
severity: high
source_files:
  - app/api/workflows/route.ts
---

## What this tests
`POST /api/workflows` creates a new workflow and returns HTTP 200 with a JSON body containing a single `slug` field whose value is a 10-character nanoid string.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Send the create request:
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows
   ```
2. Inspect the response status and body.
3. Send a second POST to confirm each call produces a different slug:
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows
   ```
4. Compare the two `slug` values.

## Expected result
- HTTP status: **200**
- Response body shape: `{"slug": "<value>"}` — exactly one field named `slug`.
- `slug` value is a string of **exactly 10 characters** using the nanoid alphabet (URL-safe: `A-Z a-z 0-9 _ -`).
- The two slugs returned by the two POST calls are **different** from each other.
- A corresponding workflow row is created: `GET /api/workflows` lists the new slug.

## Failure indicators
- Response status is not 200.
- Response body is missing the `slug` field or contains additional unexpected fields.
- `slug` length is not exactly 10 characters.
- Both POST calls return the same slug value.

## Severity rationale
The slug is the primary identifier used in every subsequent API route (`/api/workflows/[slug]/...`); a wrong length or collision breaks all downstream workflow operations.

## Source reference
`app/api/workflows/route.ts` lines 13–27 — `POST` generates `slug = nanoid(10)`, inserts the workflow with `name = "Untitled Workflow"`, and returns `NextResponse.json({ slug })`.

## Notes
No request body or headers are required. The route also inserts a default API key row (`sk-wf-{uuid}`) for the new workflow, but that key is not included in the response.
