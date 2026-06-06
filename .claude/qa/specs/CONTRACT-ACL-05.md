---
id: CONTRACT-ACL-05
title: POST access-list with rule_type header creates entry
severity: high
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that POST with `rule_type: "header"` creates an entry and the returned entry has `rule_type` set to `"header"`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Create a header-type entry:
   ```
   curl -s -o /tmp/acl05.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"X-Secret: mysecret","label":"required header","rule_type":"header"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/acl05.json`
3. Confirm `rule_type`: `cat /tmp/acl05.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['entry']['rule_type'])"`

## Expected result
HTTP `201`. Response body is `{"entry":{"id":<integer>,"value":"X-Secret: mysecret","label":"required header","rule_type":"header","created_at":"<timestamp>"}}`. Step 3 prints `header`.

## Failure indicators
- HTTP status other than 201
- `entry.rule_type` is not `"header"` (e.g. silently defaulted to `"value"`)
- `entry.value` differs from what was submitted

## Severity rationale
High: header-type entries are one of four valid rule types; storing the wrong type causes the Access List node to evaluate header rules incorrectly.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 32–42: `VALID_RULE_TYPES = ["value","ip","cidr","header"]`; `rule_type` accepted verbatim when it matches the list.
