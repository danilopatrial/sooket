---
id: CONTRACT-PRESET-05
title: POST preset name > 100 chars is silently truncated
severity: medium
source_files:
  - app/api/workflows/[slug]/presets/route.ts
---

## What this tests
Verifies that a `name` value longer than 100 characters is silently truncated to 100 characters rather than rejected with a 400.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Send a POST with a 101-character name:
   ```
   curl -s -o /tmp/preset05.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H 'Content-Type: application/json' \
     -d "{\"name\":\"$(python3 -c "print('A'*101")\",\"body\":\"{}\"}"
   ```
   Or with a static 101-char string:
   ```
   curl -s -o /tmp/preset05.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H 'Content-Type: application/json' \
     -d '{"name":"AAAAAAAAAABBBBBBBBBBCCCCCCCCCCDDDDDDDDDDEEEEEEEEEEAAAAAAAAAABBBBBBBBBBCCCCCCCCCCDDDDDDDDDDEEEEEEEEEE1","body":"{}"}'
   ```
2. Note the HTTP status code printed after the request.
3. Read the response: `cat /tmp/preset05.json`
4. Check the length of `preset.name` in the response: `cat /tmp/preset05.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['preset']['name']))"`

## Expected result
HTTP status `201` is returned. The `preset.name` in the response body is exactly 100 characters long — the input was truncated, not rejected. No 400 error is returned.

## Failure indicators
- HTTP 400 returned for a 101-character name (the server truncates, not rejects)
- HTTP 201 returned but `preset.name` length is 101 (truncation not applied)
- Any non-201 status code

## Severity rationale
Medium: silent truncation is surprising to API consumers who submitted a 101-char name and receive back a 100-char name with no warning, but no data is lost for names ≤100 chars.

## Source reference
`app/api/workflows/[slug]/presets/route.ts` line 70: `name = payload.name.trim().slice(0, 100);`

## Notes
The checklist description reads "POST with name longer than 100 chars returns 400", but the actual implementation silently truncates via `.slice(0, 100)` and returns 201. The spec documents the real implementation behavior.
