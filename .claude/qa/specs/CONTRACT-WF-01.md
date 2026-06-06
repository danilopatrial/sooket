---
id: CONTRACT-WF-01
title: GET /api/workflows returns array with slug and name fields
severity: high
source_files:
  - app/api/workflows/route.ts
---

## What this tests
`GET /api/workflows` returns HTTP 200 with a JSON array where every element contains `id`, `slug`, and `name`, ordered alphabetically by name. No sensitive fields (`api_key`, `nodes`, `edges`) are exposed.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists in the database (create one if needed using the step below)

## Steps
1. Ensure at least one workflow exists:
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows
   ```
   Note the returned `slug` value.

2. Send the list request:
   ```bash
   curl -s http://localhost:3000/api/workflows
   ```

3. Inspect the response body.

## Expected result
- HTTP status: **200**
- Response body is a **JSON array** (not an object).
- Every element in the array has:
  - `"id"`: an integer (the database row ID; consumed by the General config tab's error-workflow picker — see CFG-GEN-04)
  - `"slug"`: a non-empty string
  - `"name"`: a non-empty string
- Only `id`, `slug`, and `name` are present on each element; no sensitive fields (`api_key`, `nodes`, `edges`) are exposed.
- Elements are ordered alphabetically by `name` ascending.
- If no workflows exist, the response is an empty array `[]`.

## Failure indicators
- Response status is not 200.
- Response body is a JSON object instead of an array.
- Any array element is missing `slug` or `name`.
- Any array element contains sensitive fields such as `api_key`, `nodes`, or `edges`.
- Array is not sorted alphabetically by name.

## Severity rationale
The workflow list is the entry point for the dashboard and any tooling that enumerates workflows; a missing or malformed field breaks navigation and management flows.

## Source reference
`app/api/workflows/route.ts` lines 7–10 — `SELECT id, slug, name FROM workflows ORDER BY name ASC`; result is returned directly as `NextResponse.json(rows)`.

## Notes
No authentication header is required — this is a local-only instance. The `name` field defaults to `"Untitled Workflow"` for newly created workflows (line 20).
