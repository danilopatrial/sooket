---
id: CONTRACT-AKEY-03
title: POST api-key format is sk-wf- plus 32 hex chars
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that the `key` value returned by POST has the exact format `sk-wf-` followed by 32 lowercase hexadecimal characters (a UUID with hyphens stripped).

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Create a new API key:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"format-check"}' > /tmp/akey03.json
   ```
2. Extract and validate the key format:
   ```
   python3 -c "
   import json, re
   d = json.load(open('/tmp/akey03.json'))
   key = d['key']['key']
   print('key:', key)
   print('length:', len(key))
   print('matches pattern:', bool(re.fullmatch(r'sk-wf-[0-9a-f]{32}', key)))
   "
   ```

## Expected result
`key` starts with `sk-wf-`, total length is 38 characters, and the suffix is exactly 32 lowercase hexadecimal characters (`[0-9a-f]{32}`). The pattern check prints `True`.

## Failure indicators
- Key does not start with `sk-wf-`
- Suffix contains hyphens (UUID not stripped)
- Total length is not 38
- Pattern match returns `False`

## Severity rationale
High: callers that prefix-match or validate key format will break if the format changes; this locks down the contract.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` line 86: `const key = \`sk-wf-${crypto.randomUUID().replace(/-/g, "")}\`` — UUID hyphens are stripped, yielding 32 hex chars.
