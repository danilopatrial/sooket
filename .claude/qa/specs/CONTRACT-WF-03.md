---
id: CONTRACT-WF-03
title: GET /api/workflows/[slug] returns workflow object
severity: high
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
GET `/api/workflows/[slug]` returns a JSON object with `id`, `name`, `slug`, `nodes` (parsed array), `isActive` (boolean), and `errorWorkflowId` (integer or null) for a known workflow slug.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists in the database (obtain its slug from `POST /api/workflows` or the dashboard)

## Steps
1. Create a workflow and capture its slug:
   ```bash
   SLUG=$(curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"WF-03 Test"}' | jq -r '.slug')
   echo "Slug: $SLUG"
   ```
2. Fetch the workflow by slug:
   ```bash
   curl -s http://localhost:3000/api/workflows/$SLUG | jq .
   ```

## Expected result
HTTP 200 with a JSON body containing exactly these top-level keys:
- `id` — integer (the database row ID)
- `name` — string matching the workflow name supplied at creation (`"WF-03 Test"`)
- `slug` — string matching `$SLUG`
- `nodes` — a parsed JSON array (not a raw string)
- `isActive` — boolean (`false` for a newly created workflow)
- `errorWorkflowId` — integer or `null` (the assigned error workflow; `null` for a newly created workflow). Consumed by the General config tab's error-workflow picker (CFG-GEN-04).

Neither `edges` nor `webhookToken` is present in the response (the webhook token is a gating secret and must not be exposed here).

Example shape:
```json
{
  "id": 1,
  "name": "WF-03 Test",
  "slug": "abc1234567",
  "nodes": [],
  "isActive": false,
  "errorWorkflowId": null
}
```

## Failure indicators
- Response status is not 200
- Any of `id`, `name`, `slug`, `nodes`, `isActive`, or `errorWorkflowId` is absent from the response body
- `nodes` is a JSON string (i.e., double-encoded) rather than an array
- `isActive` is `0` or `1` instead of a boolean
- An `edges` key is present in the response (it is not returned by this endpoint)
- A `webhookToken` key is present in the response (the gating secret must not be exposed)

## Severity rationale
The canvas editor fetches workflow data via this endpoint on load; missing or incorrectly typed fields would break the canvas.

## Source reference
`app/api/workflows/[slug]/route.ts` lines 10–20 — the SELECT query and JSON response construction.

## Notes
`nodes` is stored as a JSON string in SQLite but is parsed with `JSON.parse` before being returned, so the response value must be an array or object, not a string.
