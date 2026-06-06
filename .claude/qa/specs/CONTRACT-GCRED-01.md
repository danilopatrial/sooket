---
id: CONTRACT-GCRED-01
title: GET /api/credentials returns full credentials list
severity: medium
source_files:
  - app/api/credentials/route.ts
---

## What this tests
Verifies that GET /api/credentials returns the full list of global credentials via the SQLite adapter.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. GET the credentials list:
   ```
   curl -s http://localhost:3000/api/credentials | jq .
   ```

2. (Optional) Create a credential first to ensure the list is non-empty, then repeat step 1:
   ```
   curl -s -X POST http://localhost:3000/api/credentials \
     -H "Content-Type: application/json" \
     -d '{"name":"TestCred","type":"api_key","key":"sk-test-123"}' | jq .
   curl -s http://localhost:3000/api/credentials | jq .
   ```

## Expected result
HTTP status `200` with a JSON array. Each element represents one credential. After creating a credential in step 2, the array contains at least one entry including the newly created credential's `name` and `type` fields.

## Failure indicators
- HTTP status other than 200.
- Response is not a JSON array.
- After creating a credential, it does not appear in the list.

## Severity rationale
The credentials list is the primary UI data source for the global credential pool; failure would leave the Credentials tab blank.

## Source reference
`app/api/credentials/route.ts` — lines 7–10:
```ts
export async function GET() {
  const adapter = createSqliteAdapter();
  return NextResponse.json(adapter.listCredentials());
}
```
