---
id: CONTRACT-ACL-03
title: POST access-list with rule_type ip creates entry
severity: high
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that POST with `rule_type: "ip"` creates an entry and the returned entry has `rule_type` set to `"ip"`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Create an IP-type entry:
   ```
   curl -s -o /tmp/acl03.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"203.0.113.42","label":"blocked host","rule_type":"ip"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/acl03.json`
3. Confirm `rule_type` in the response: `cat /tmp/acl03.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['entry']['rule_type'])"`

## Expected result
HTTP `201`. Response body is `{"entry":{"id":<integer>,"value":"203.0.113.42","label":"blocked host","rule_type":"ip","created_at":"<timestamp>"}}`. Step 3 prints `ip`.

## Failure indicators
- HTTP status other than 201
- `entry.rule_type` is not `"ip"` (e.g. defaulted to `"value"`)
- `entry.value` is not `"203.0.113.42"`

## Severity rationale
High: `rule_type` determines enforcement logic in the Access List node; storing the wrong type causes mis-enforcement at runtime.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 32–42: `VALID_RULE_TYPES = ["value","ip","cidr","header"]`; `rule_type` is accepted verbatim when it matches a valid type.
