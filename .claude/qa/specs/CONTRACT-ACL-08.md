---
id: CONTRACT-ACL-08
title: POST access-list missing value returns 400
severity: high
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that a POST request with a missing or empty `value` field returns HTTP 400 with `{"error": "value is required"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST without `value`:
   ```
   curl -s -o /tmp/acl08a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"rule_type":"ip"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/acl08a.json`
3. POST with an empty-string `value`:
   ```
   curl -s -o /tmp/acl08b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"","rule_type":"ip"}'
   ```
4. Note the HTTP status code. Inspect: `cat /tmp/acl08b.json`
5. POST with a whitespace-only `value`:
   ```
   curl -s -o /tmp/acl08c.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H 'Content-Type: application/json' \
     -d '{"value":"   ","rule_type":"ip"}'
   ```
6. Note the HTTP status code. Inspect: `cat /tmp/acl08c.json`

## Expected result
All three requests return HTTP `400`. Response body is `{"error":"value is required"}` in each case.

## Failure indicators
- Any request returns 2xx instead of 400
- Response body does not contain `"value is required"`
- Whitespace-only `value` is accepted (trimming not applied before the check)

## Severity rationale
High: accepting an empty value would insert a blank entry into the access list that can never be meaningfully enforced.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 36–37: `const value = (body.value ?? "").trim(); if (!value) return NextResponse.json({ error: "value is required" }, { status: 400 });`
