---
id: CONTRACT-WF-05
title: PATCH workflow slug updates name field
severity: high
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
PATCH /api/workflows/[slug] with a `name` body field updates the stored workflow name and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000
- `curl` and `jq` available in the shell

## Steps
1. Create a workflow and capture its slug:
   ```
   SLUG=$(curl -s -X POST http://localhost:3000/api/workflows | jq -r '.slug')
   echo "slug: $SLUG"
   ```
2. Rename the workflow:
   ```
   curl -s -X PATCH http://localhost:3000/api/workflows/$SLUG \
     -H "Content-Type: application/json" \
     -d '{"name": "My Renamed Workflow"}'
   ```
3. Fetch the workflow and check its name:
   ```
   curl -s http://localhost:3000/api/workflows/$SLUG | jq '.name'
   ```

## Expected result
- Step 2 returns HTTP 200 with body `{"ok":true}`.
- Step 3 returns `"My Renamed Workflow"`.

## Failure indicators
- Step 2 returns a non-200 status code or a body other than `{"ok":true}`.
- Step 3 returns the old name (`"Untitled Workflow"`) instead of `"My Renamed Workflow"`.
- Step 3 returns a 404 (slug was changed or workflow was lost).

## Severity rationale
Renaming workflows is a core workflow management action; a broken PATCH breaks the dashboard and canvas rename flows.

## Source reference
`app/api/workflows/[slug]/route.ts` lines 74 and 89 — `if (body.name !== undefined) { sets.push("name = ?"); values.push(body.name); }` followed by the UPDATE statement.

## Notes
No version snapshot is created when only `name` is patched — that only happens when `nodes` or `edges` are present in the body (lines 56–71).
