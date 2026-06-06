---
id: CONTRACT-VER-01
title: GET versions returns {versions} with parsed nodes/edges
severity: high
source_files:
  - app/api/workflows/[slug]/versions/route.ts
---

## What this tests
Verifies that `GET /api/workflows/[slug]/versions` returns a `{versions: [...]}` response where each entry has `id`, `created_at`, and fully parsed (not raw JSON string) `nodes` and `edges` arrays.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- At least one version snapshot exists (created automatically when nodes/edges are saved via PATCH)

## Steps
1. Trigger a version snapshot by saving the canvas (or via PATCH):
   ```
   curl -s -X PATCH http://localhost:3000/api/workflows/<slug> \
     -H "Content-Type: application/json" \
     -d '{"nodes": [], "edges": []}' > /dev/null
   ```
2. Fetch the versions list:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/versions \
     | python3 -m json.tool
   ```
3. Inspect the top-level `versions` key.
4. Inspect the first entry — confirm `nodes` and `edges` are JSON arrays, not strings.
5. Confirm entries are ordered most-recent first (highest `id` first).

## Expected result
- HTTP status code is `200`.
- Response body has shape `{"versions": [...]}`.
- Each entry in `versions` contains exactly these fields:
  - `id` (number)
  - `created_at` (string)
  - `nodes` (array — already parsed, not a JSON string)
  - `edges` (array — already parsed, not a JSON string)
- Entries are ordered by `id` descending (most recent first).
- If no versions exist, response is `{"versions": []}`.

## Failure indicators
- HTTP status code is not 200.
- Top-level key is not `versions`.
- `nodes` or `edges` are returned as raw JSON strings instead of parsed arrays.
- Any entry is missing `id`, `created_at`, `nodes`, or `edges`.
- Entries are not ordered most-recent first.

## Severity rationale
The History Panel diff view and restore flow depend on correctly parsed `nodes`/`edges` arrays; raw strings would break both features.

## Source reference
`app/api/workflows/[slug]/versions/route.ts` lines 27–32 — each version row's `nodes` and `edges` are passed through `JSON.parse()` before being returned, converting stored strings into arrays.  
Line 24 — `ORDER BY id DESC LIMIT 50` defines ordering and the 50-entry cap.

## Notes
Versions are capped at 50 per workflow (see CONTRACT-VER-05). The endpoint returns an empty array (not 404) when the workflow exists but has no version snapshots yet.
