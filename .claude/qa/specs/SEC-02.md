---
id: SEC-02
title: Customer variable values encrypted and never returned in GET responses
severity: critical
source_files:
  - lib/crypto.ts
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
Verifies that customer variable values are stored as AES-GCM encrypted ciphertext in the database, and that GET responses return only variable names (never values) — making variables effectively write-only from the API perspective.

## Steps — create a variable

1. Send a POST to create a variable:
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/variables \
     -H "Content-Type: application/json" \
     -d '{"name": "MY_SECRET", "value": "super-secret-123"}'
   ```
2. Verify response: `{ "ok": true }` (no value returned)

## Steps — GET returns names only

3. Send a GET request:
   ```bash
   curl -s http://localhost:3000/api/workflows/<slug>/variables
   ```
4. Verify the response is an array of objects with only `name` and `created_at` fields:
   ```json
   [{ "name": "MY_SECRET", "created_at": "..." }]
   ```
5. Confirm the response does NOT contain `value`, `encrypted_value`, or any form of the secret

## Steps — encrypted at rest

6. Open `data/sooket.db` with sqlite3:
   ```sql
   SELECT name, encrypted_value FROM customer_variables WHERE name = 'MY_SECRET';
   ```
7. Verify `encrypted_value` is a lowercase hex string — not `"super-secret-123"`
8. Verify the hex string begins with a 24-character IV portion (12 bytes = 24 hex chars) followed by the ciphertext

## Steps — upsert does not reveal old value

9. POST the same variable name with a different value
10. GET the variables list — still shows only name and created_at; no value leakage

## Expected result
- POST: stores `encrypt(value.trim(), ENCRYPTION_SECRET)` in `encrypted_value` column
- GET: `SELECT name, created_at` — `encrypted_value` column is never queried or returned
- No API endpoint returns the plaintext or ciphertext of a variable value
- Variables are effectively write-only: create/update is possible, but reading the value is not

## Failure indicators
- GET response includes a `value` or `encrypted_value` field
- Database stores plaintext in `encrypted_value`
- POST response echoes back the value

## Severity rationale
Customer variables hold secrets (API keys, tokens, passwords); a response that exposes any form of the value would be a critical data leak.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` lines 24-28 (GET: `SELECT name, created_at` — no value column), line 48 (`encrypt(value.trim(), SECRET)` before storage); `lib/crypto.ts` (AES-GCM encryption).
