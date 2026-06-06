---
id: CONTRACT-AKEY-15
title: GET api-key stats for wrong workflow returns 404
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/[id]/stats/route.ts
---

## What this tests
Verifies that GET `/api/workflows/[slug]/api-keys/[id]/stats` returns HTTP 404 when the key `id` exists but belongs to a different workflow than the `slug` in the path.

## Prerequisites
- App is running at http://localhost:3000
- Two workflows exist: `slug-a` and `slug-b`
- An API key exists in `slug-a`; note its integer `id`

## Steps
1. Create a key in workflow A if needed:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug-a>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"cross-wf-stats"}' \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['key']['id'])"
   ```
   Note the `id`.
2. Fetch stats using workflow B's slug with workflow A's key id:
   ```
   curl -s -o /tmp/akey15.json -w "%{http_code}" \
     http://localhost:3000/api/workflows/<slug-b>/api-keys/<id>/stats
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/akey15.json`
4. Confirm the same request succeeds with the correct slug:
   ```
   curl -s -o /tmp/akey15ok.json -w "%{http_code}" \
     http://localhost:3000/api/workflows/<slug-a>/api-keys/<id>/stats
   ```
   Note status — should be 200.

## Expected result
Step 2 returns HTTP `404` with `{"error":"Key not found"}`. Step 4 returns HTTP `200` with the stats object.

## Failure indicators
- Step 2 returns 200 (cross-workflow stats access — information disclosure)
- Stats data from workflow A is visible via workflow B's slug
- Step 4 returns anything other than 200

## Severity rationale
High: leaking stats across workflow boundaries exposes request volume and token usage of another workflow's keys to unauthorized callers.

## Source reference
`app/api/workflows/[slug]/api-keys/[id]/stats/route.ts` lines 16–21: `JOIN workflows w ON w.id = k.workflow_id WHERE k.id = ? AND w.slug = ?` — ownership enforced via JOIN; returns 404 if the slug/id pair does not match.
