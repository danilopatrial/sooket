---
id: CONTRACT-VER-02
title: POST versions with valid versionId restores that version
severity: high
source_files:
  - app/api/workflows/[slug]/versions/route.ts
---

## What this tests
Verifies that `POST /api/workflows/[slug]/versions` with a valid `versionId` restores the workflow's `nodes` and `edges` to the state recorded in that version snapshot, and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- At least one version snapshot exists; obtain its `id` via `GET /api/workflows/<slug>/versions`

## Steps
1. Get the list of versions and note the `id` of the first entry:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/versions \
     | python3 -c "import sys,json; vs=json.load(sys.stdin)['versions']; print(vs[0]['id']) if vs else print('no versions')"
   ```
   Refer to the printed value as `<version-id>`.
2. Send a POST request to restore that version:
   ```
   curl -s -o /tmp/ver02.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/versions \
     -H "Content-Type: application/json" \
     -d "{\"versionId\": <version-id>}"
   ```
3. Inspect the HTTP status code and `/tmp/ver02.json`.
4. Verify the workflow now reflects the restored state:
   ```
   curl -s http://localhost:3000/api/workflows/<slug> \
     | python3 -m json.tool
   ```

## Expected result
- HTTP status code is `200`.
- Response body is `{"ok": true}`.
- A subsequent `GET /api/workflows/<slug>` returns `nodes` and `edges` matching the restored version snapshot.

## Failure indicators
- HTTP status code is not 200.
- Response body does not contain `"ok": true`.
- `GET /api/workflows/<slug>` after the restore still shows the pre-restore nodes/edges.
- The server returns a 404 for a version `id` that was just obtained from the versions list.

## Severity rationale
Version restore is the primary history recovery mechanism; a broken restore leaves users unable to recover from bad canvas edits.

## Source reference
`app/api/workflows/[slug]/versions/route.ts` lines 73–75 — `UPDATE workflows SET nodes = ?, edges = ?` applies the version's stored data to the live workflow record.  
Line 77 — `return NextResponse.json({ ok: true })`.

## Notes
Before applying the restore, the endpoint first creates a new version snapshot of the current (to-be-overwritten) state (lines 65–70), so the restore itself is also reversible. The version must belong to the same workflow (`WHERE id = ? AND workflow_id = ?`); a version from a different workflow returns 404 (see CONTRACT-VER-04).
