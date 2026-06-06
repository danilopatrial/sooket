---
id: CONTRACT-ACL-02
title: POST access-list with rule_type value creates entry
severity: high
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that POST with `rule_type: "value"` creates an access list entry and returns HTTP 201 with the created entry object.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Create a value-type entry:
   ```
   curl -s -o /tmp/acl02.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"blocked-token-abc","label":"test label","rule_type":"value"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/acl02.json`
3. Verify the entry appears in the list:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/access-list
   ```

## Expected result
Step 1 returns HTTP `201`. Response body is `{"entry":{"id":<integer>,"value":"blocked-token-abc","label":"test label","rule_type":"value","created_at":"<timestamp>"}}`. The `entries` array in step 3 contains the new entry.

## Failure indicators
- HTTP status other than 201
- Response top-level key is not `entry`
- `entry.rule_type` is not `"value"`
- `entry.id` is missing or not an integer
- Entry does not appear in subsequent GET

## Severity rationale
High: POST is the sole creation path for access list entries; a broken contract blocks all rule configuration.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 46–52: INSERT then SELECT returning `id, value, label, rule_type, created_at`, response status 201.
