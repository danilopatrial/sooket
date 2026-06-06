---
id: CONTRACT-GCRED-02
title: POST /api/credentials with valid body returns id
severity: medium
source_files:
  - app/api/credentials/route.ts
---

## What this tests
Verifies that POST /api/credentials with a valid `{name, type, key}` body stores the encrypted credential and returns a response containing the new credential's `id`.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. POST a new global credential:
   ```
   curl -s -X POST http://localhost:3000/api/credentials \
     -H "Content-Type: application/json" \
     -d '{"name":"MyProvider","type":"api_key","key":"sk-abc-123"}' | jq .
   ```

2. Confirm the credential appears in the list:
   ```
   curl -s http://localhost:3000/api/credentials | jq .
   ```

## Expected result
Step 1 returns HTTP 200 with a response body containing an `id` field:
```json
{ "id": <integer> }
```
Step 2 returns an array that includes an entry with `name: "MyProvider"` and `type: "api_key"`. The raw `key` value is not present in the GET response (it is stored encrypted).

## Failure indicators
- Step 1 returns a status other than 200.
- Step 1 response body does not contain an `"id"` field.
- Step 2 does not include an entry with `name: "MyProvider"`.

## Severity rationale
Credential creation is the entry point for the global credential pool; a broken POST would prevent any node from being linked to a credential.

## Source reference
`app/api/credentials/route.ts` — lines 12–23:
```ts
export async function POST(request: Request) {
  const { name, type, key } = body;
  if (!name || !type || !key) { ... }
  const encryptedData = await encrypt(key.trim(), SECRET);
  const id = adapter.upsertCredential(name.trim(), type.trim(), encryptedData);
  return NextResponse.json({ id });
}
```

## Notes
The `key` is encrypted with AES-GCM + PBKDF2 before storage. The plaintext key is never persisted and will not appear in any GET response.
