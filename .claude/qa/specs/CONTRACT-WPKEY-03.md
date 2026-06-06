---
id: CONTRACT-WPKEY-03
title: POST missing provider returns 400
severity: low
source_files:
  - app/api/workflows/[slug]/provider-keys/route.ts
---

## What this tests
POST /api/workflows/[slug]/provider-keys with a body that omits the `provider` field returns HTTP 400 with an error message.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; obtain its slug via `POST /api/workflows`

## Steps
1. Create a workflow (replace `<slug>` with the returned slug):
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"wpkey-missing-provider"}' | jq -r '.slug'
   ```
2. POST to the provider-keys endpoint without a `provider` field:
   ```
   curl -s -o /dev/null -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"key":"sk-ant-test-key"}'
   ```
3. Capture the response body as well:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/provider-keys \
     -H "Content-Type: application/json" \
     -d '{"key":"sk-ant-test-key"}'
   ```

## Expected result
HTTP 400 with response body:
```json
{"error": "Missing provider or key"}
```

## Failure indicators
- Response status is not 400
- Response body does not contain an `error` field
- Request is accepted (200) and a row is inserted without a provider value

## Severity rationale
Input validation errors are low severity — the behavior is a guard rail, not a core workflow function.

## Source reference
`app/api/workflows/[slug]/provider-keys/route.ts` line 15 — `if (!provider || !key)` check returns 400 with `{error: "Missing provider or key"}`.
