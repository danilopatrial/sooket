---
id: CONTRACT-ACL-04
title: POST access-list with rule_type cidr creates entry
severity: high
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that POST with `rule_type: "cidr"` creates an entry and the returned entry has `rule_type` set to `"cidr"`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Create a CIDR-type entry:
   ```
   curl -s -o /tmp/acl04.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"10.0.0.0/8","label":"internal network","rule_type":"cidr"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/acl04.json`
3. Confirm `rule_type`: `cat /tmp/acl04.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['entry']['rule_type'])"`

## Expected result
HTTP `201`. Response body is `{"entry":{"id":<integer>,"value":"10.0.0.0/8","label":"internal network","rule_type":"cidr","created_at":"<timestamp>"}}`. Step 3 prints `cidr`.

## Failure indicators
- HTTP status other than 201
- `entry.rule_type` is not `"cidr"` (e.g. defaulted to `"value"`)
- `entry.value` is not `"10.0.0.0/8"`

## Severity rationale
High: CIDR entries require correct `rule_type` for subnet-matching enforcement; wrong type would cause the Access List node to apply string equality instead of range check.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 32–42: `VALID_RULE_TYPES = ["value","ip","cidr","header"]`; accepted verbatim when it matches.
