---
id: CONTRACT-ACL-10
title: DELETE access-list without id param returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Verifies that DELETE without an `id` query parameter returns HTTP 400 with `{"error": "id query param required"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. DELETE with no query params at all:
   ```
   curl -s -o /tmp/acl10a.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/access-list
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/acl10a.json`
3. DELETE with an empty `id` param:
   ```
   curl -s -o /tmp/acl10b.json -w "%{http_code}" \
     -X DELETE "http://localhost:3000/api/workflows/<slug>/access-list?id="
   ```
4. Note the HTTP status code. Inspect: `cat /tmp/acl10b.json`

## Expected result
Both requests return HTTP `400`. Response body is `{"error":"id query param required"}` in each case.

## Failure indicators
- Any request returns a status other than 400
- Response body does not contain `"id query param required"`
- An empty `id` param is treated as valid and attempts a DB operation

## Severity rationale
Medium: missing parameter validation is a contract requirement; without it, `Number(null)` would be passed to the DB query causing unpredictable deletion.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 67–68: `const id = searchParams.get("id"); if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });`
