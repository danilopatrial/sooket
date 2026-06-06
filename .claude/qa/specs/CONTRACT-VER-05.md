---
id: CONTRACT-VER-05
title: Version count capped at 50; oldest deleted on overflow
severity: low
source_files:
  - app/api/workflows/[slug]/versions/route.ts
  - app/api/workflows/[slug]/route.ts
---

## What this tests
Verifies that the workflow version history is capped at 50 entries per workflow: when a 51st version would be created, the oldest entry is deleted so the count stays at 50.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)
- The workflow currently has fewer than 50 versions (start fresh or use a new workflow)

## Steps
1. Record the ID of the oldest existing version (if any):
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/versions \
     | python3 -c "import sys,json; vs=json.load(sys.stdin)['versions']; print(vs[-1]['id'] if vs else 'none')"
   ```
   Note this as `<oldest-id>`.

2. Generate enough saves to push the total past 50. Each PATCH with nodes/edges creates one version:
   ```
   for i in $(seq 1 52); do
     curl -s -X PATCH http://localhost:3000/api/workflows/<slug> \
       -H "Content-Type: application/json" \
       -d "{\"nodes\": [{\"id\":\"n$i\"}], \"edges\": []}" > /dev/null
   done
   ```

3. Fetch the versions list and count entries:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/versions \
     | python3 -c "import sys,json; vs=json.load(sys.stdin)['versions']; print(len(vs)); print('oldest id:', vs[-1]['id'])"
   ```

## Expected result
- The count of versions is exactly `50` (not 51 or 52).
- The entry with `<oldest-id>` (recorded in step 1) is no longer present in the list — it was purged to enforce the cap.
- The 50 entries present are the 50 most recently created versions.

## Failure indicators
- Version count exceeds 50 — the cap is not being enforced.
- Version count drops below 50 when more than 50 saves have been made.
- The oldest entry (`<oldest-id>`) is still present after 52 saves.

## Severity rationale
Without the cap, the `workflow_versions` table would grow unboundedly, degrading History Panel load time and consuming unlimited disk space.

## Source reference
`app/api/workflows/[slug]/route.ts` lines 68–70 — cap enforced on every PATCH that includes `nodes`/`edges`: `DELETE FROM workflow_versions WHERE workflow_id = ? AND id NOT IN (SELECT id FROM workflow_versions WHERE workflow_id = ? ORDER BY id DESC LIMIT 50)`.  
`app/api/workflows/[slug]/versions/route.ts` lines 68–70 — same cap enforced after every restore snapshot insert.

## Notes
The cap is applied after each insert, not in bulk. The `GET /api/workflows/[slug]/versions` query itself also uses `LIMIT 50`, so even if the cap enforcement were missing, the GET would never return more than 50 entries — but the database rows would still accumulate.
