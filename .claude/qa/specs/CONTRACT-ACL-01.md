---
id: CONTRACT-ACL-01
title: GET access-list returns entries array
severity: high
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that GET `/api/workflows/[slug]/access-list` returns `{"entries": [...]}` with all fields for each entry, ordered by creation time ascending.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Fetch the access list for an empty workflow:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/access-list
   ```
2. Add two entries:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"192.168.1.1","rule_type":"ip"}'
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"10.0.0.0/8","rule_type":"cidr","label":"internal"}'
   ```
3. Fetch again:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/access-list
   ```
4. Try a non-existent slug:
   ```
   curl -s -o /tmp/acl01.json -w "%{http_code}" \
     http://localhost:3000/api/workflows/nonexistent-slug/access-list
   ```

## Expected result
Step 1 returns HTTP 200 with `{"entries":[]}`. Step 3 returns HTTP 200 with `{"entries":[...]}` containing two objects, each with fields `id`, `value`, `label`, `rule_type`, and `created_at`. Entries are ordered oldest-first. Step 4 returns HTTP 404.

## Failure indicators
- Response top-level key is not `entries`
- Entry objects are missing any of `id`, `value`, `label`, `rule_type`, `created_at`
- Entries are not in ascending creation order
- Non-existent slug returns anything other than 404

## Severity rationale
High: GET is the primary read path for access list management; wrong shape breaks all consumers.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 14–25: `SELECT id, value, label, rule_type, created_at … ORDER BY created_at ASC`, returns `{ entries }`.
