---
id: CONTRACT-WF-06
title: PATCH with nodes/edges creates version snapshot
severity: high
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
PATCH /api/workflows/[slug] with `nodes` or `edges` in the body inserts a row into `workflow_versions` before applying the update.

## Prerequisites
- App is running at http://localhost:3000
- `curl` and `jq` available in the shell

## Steps
1. Create a workflow and capture its slug:
   ```
   SLUG=$(curl -s -X POST http://localhost:3000/api/workflows | jq -r '.slug')
   echo "slug: $SLUG"
   ```
2. Check that no versions exist yet:
   ```
   curl -s http://localhost:3000/api/workflows/$SLUG/versions | jq '.versions | length'
   ```
3. PATCH the workflow with a new nodes array:
   ```
   curl -s -X PATCH http://localhost:3000/api/workflows/$SLUG \
     -H "Content-Type: application/json" \
     -d '{"nodes": [{"id": "input-1", "type": "workflowInput", "position": {"x": 100, "y": 100}, "data": {}}]}'
   ```
4. Verify the version count increased:
   ```
   curl -s http://localhost:3000/api/workflows/$SLUG/versions | jq '.versions | length'
   ```
5. PATCH again with a different nodes array:
   ```
   curl -s -X PATCH http://localhost:3000/api/workflows/$SLUG \
     -H "Content-Type: application/json" \
     -d '{"nodes": [{"id": "input-1", "type": "workflowInput", "position": {"x": 200, "y": 200}, "data": {}}]}'
   ```
6. Verify a second version was added:
   ```
   curl -s http://localhost:3000/api/workflows/$SLUG/versions | jq '.versions | length'
   ```

## Expected result
- Step 2 returns `0` (no versions on a newly created workflow).
- Step 3 returns HTTP 200 with body `{"ok":true}`.
- Step 4 returns `1` (one version snapshot was created).
- Step 5 returns HTTP 200 with body `{"ok":true}`.
- Step 6 returns `2` (a second version snapshot was created).

## Failure indicators
- Step 4 returns `0` — no snapshot was created despite patching nodes.
- Step 6 returns `1` — only one snapshot regardless of how many node patches were applied.
- Any PATCH step returns a non-200 status.

## Severity rationale
Version snapshots are the sole mechanism for version history and rollback; if they are not created on save, workflow history is silently lost.

## Source reference
`app/api/workflows/[slug]/route.ts` lines 56–71 — snapshot INSERT into `workflow_versions` triggered when `body.nodes !== undefined || body.edges !== undefined`, capped at 50 rows per workflow.

## Notes
Patching only `name` (without `nodes` or `edges`) does NOT create a version snapshot — that path skips the versioning block entirely (line 56 condition). A PATCH containing only `edges` also triggers snapshotting.
