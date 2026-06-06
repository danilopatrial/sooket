---
id: CONTRACT-VER-03
title: POST versions restore snapshots current state before restoring
severity: medium
source_files:
  - app/api/workflows/[slug]/versions/route.ts
---

## What this tests
Verifies that when a version restore is performed, the endpoint first inserts a new version snapshot of the workflow's pre-restore state, so the restore itself is reversible via the versions list.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- At least one version snapshot exists with a known `id` (referred to as `<version-id>`)
- The current live workflow nodes/edges differ from those in `<version-id>` (make an edit if needed)

## Steps
1. Record the version count before the restore:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/versions \
     | python3 -c "import sys,json; vs=json.load(sys.stdin)['versions']; print(len(vs))"
   ```
   Note this as `<count-before>`.
2. Also note the `nodes` of the current live workflow for comparison:
   ```
   curl -s http://localhost:3000/api/workflows/<slug> \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['nodes'])"
   ```
3. Perform the restore:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/versions \
     -H "Content-Type: application/json" \
     -d "{\"versionId\": <version-id>}" | python3 -m json.tool
   ```
4. Fetch the versions list again and count entries:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/versions \
     | python3 -c "import sys,json; vs=json.load(sys.stdin)['versions']; print(len(vs)); print(vs[0]['nodes'])"
   ```

## Expected result
- HTTP status code on the restore POST is `200` with `{"ok": true}`.
- The version count after the restore is `<count-before> + 1` (a new snapshot was inserted).
- The newest version entry (first in the list, highest `id`) contains the nodes/edges that were the live state immediately before the restore — i.e., the pre-restore snapshot.

## Failure indicators
- Version count does not increase by 1 after restore — the pre-restore snapshot was not created.
- The newest version entry contains the restored (not the pre-restore) nodes/edges.
- Version count increases by more than 1.
- The restore POST does not return `{"ok": true}`.

## Severity rationale
Without the pre-restore snapshot, a mistaken restore cannot be undone via the History panel, making version history a one-way destructive operation.

## Source reference
`app/api/workflows/[slug]/versions/route.ts` lines 65–67 — `INSERT INTO workflow_versions (workflow_id, nodes, edges) VALUES (?, ?, ?)` inserts the version being restored as the new snapshot before `UPDATE workflows` is applied.

## Notes
The 50-version cap is enforced immediately after the snapshot insert (lines 68–70), so if already at 50 versions the oldest is deleted and the net count stays at 50.
