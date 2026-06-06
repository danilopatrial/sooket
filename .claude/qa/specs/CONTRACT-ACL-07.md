---
id: CONTRACT-ACL-07
title: POST access-list duplicate value returns 409
severity: high
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that posting a `value` that already exists in the workflow's access list returns HTTP 409 with `{"error": "Entry already exists"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Create an initial entry:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"duplicate-me","rule_type":"value"}'
   ```
2. Attempt to create a second entry with the same `value`:
   ```
   curl -s -o /tmp/acl07.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"duplicate-me","rule_type":"ip"}'
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/acl07.json`

## Expected result
Step 2 returns HTTP `409`. Response body is `{"error":"Entry already exists"}`. The original entry in the access list is unchanged (still has `rule_type: "value"`).

## Failure indicators
- HTTP status other than 409 on the duplicate POST
- A second entry with the same value is created (no uniqueness enforcement)
- Error message differs from `"Entry already exists"`

## Severity rationale
High: duplicate entries would cause confusing enforcement behavior and indicate the DB unique constraint is not being surfaced correctly.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 53–56: catches `Error` whose message includes `"UNIQUE"` and returns `{ error: "Entry already exists" }` with status 409.
