---
id: CONTRACT-ACL-06
title: POST access-list with no rule_type defaults to value
severity: medium
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that omitting `rule_type` (or providing an unrecognized value) silently defaults the entry's `rule_type` to `"value"` rather than returning an error.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST without `rule_type`:
   ```
   curl -s -o /tmp/acl06a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"no-type-entry"}'
   ```
2. Note the HTTP status code. Check `rule_type`: `cat /tmp/acl06a.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['entry']['rule_type'])"`
3. POST with an unrecognized `rule_type`:
   ```
   curl -s -o /tmp/acl06b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"bad-type-entry","rule_type":"unknown"}'
   ```
4. Note the HTTP status code. Check `rule_type`: `cat /tmp/acl06b.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['entry']['rule_type'])"`

## Expected result
Both requests return HTTP `201`. In both cases `entry.rule_type` is `"value"`. No 400 error is returned for an unrecognized `rule_type`.

## Failure indicators
- HTTP 400 returned for missing or unrecognized `rule_type`
- `entry.rule_type` is not `"value"` when `rule_type` was omitted or invalid
- Any non-201 status

## Severity rationale
Medium: the silent default is intentional behavior but may surprise callers who typo the rule type; documenting it prevents misconfigurations.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 40–42: `const rule_type: RuleType = VALID_RULE_TYPES.includes(body.rule_type as RuleType) ? (body.rule_type as RuleType) : "value";`
