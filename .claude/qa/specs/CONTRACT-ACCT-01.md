---
id: CONTRACT-ACCT-01
title: POST /api/account/api-key returns key with sk-mw- prefix
severity: high
source_files:
  - app/api/account/api-key/route.ts
---

## What this tests
Verifies that POST /api/account/api-key returns a management API key with the `sk-mw-` prefix in an `api_key` field.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. POST to the account API key endpoint:
   ```
   curl -s -X POST http://localhost:3000/api/account/api-key | jq .
   ```

## Expected result
HTTP status `200` with a response body containing an `api_key` field whose value begins with `sk-mw-`:
```json
{ "api_key": "sk-mw-<32 hex chars>" }
```
The full key format is `sk-mw-` followed by a UUID with dashes stripped (32 lowercase hex characters).

## Failure indicators
- HTTP status other than 200.
- Response body does not contain an `"api_key"` field.
- The `api_key` value does not start with `sk-mw-`.

## Severity rationale
The management API key is the only credential used to manage the Sooket instance programmatically; a broken endpoint leaves the instance unmanageable via API.

## Source reference
`app/api/account/api-key/route.ts` — line 12:
```ts
const apiKey = `sk-mw-${crypto.randomUUID().replace(/-/g, "")}`;
```
Returns `{ api_key: apiKey }` on line 15.

## Notes
If a key already exists in the `settings` table it is returned as-is (idempotent); see CONTRACT-ACCT-02 for that behavior.
