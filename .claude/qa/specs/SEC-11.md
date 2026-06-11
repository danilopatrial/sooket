---
id: SEC-11
title: Workflow API keys are stored hashed and unrecoverable at rest
severity: critical
source_files:
  - lib/security/api-keys.ts
  - lib/db/migrations/014-hash-api-keys.ts
  - lib/execution-handler.ts
  - app/api/workflows/[slug]/api-keys/route.ts
  - app/api/workflows/route.ts
---

## What this tests
Verifies that `sk-wf-*` workflow API keys are persisted only as a SHA-256 hash (in `workflow_api_keys.key_hash`) plus a non-secret display prefix (`key_prefix`) — never as the raw key — that authentication looks the presented key up by its hash, and that the raw value is therefore unrecoverable from the database (including a `/api/admin/backup` download) after the one-time reveal at creation. The duplicate legacy copy in `workflows.api_key` is hashed too.

## Prerequisites
- App is running at http://localhost:3000
- `sqlite3` available to inspect `data/sooket.db` directly
- A workflow exists with a known slug (`<slug>`)

## Steps — creation reveals the raw key exactly once
1. Create a key:
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H "Content-Type: application/json" -d '{"label":"test","scopes":["execute"]}'
   ```
2. Note the returned `key.key` (the full `sk-wf-...` value) and `key.key_hint`.

## Steps — nothing plaintext is stored
3. Inspect the row directly:
   ```sql
   SELECT key_hash, key_prefix FROM workflow_api_keys ORDER BY id DESC LIMIT 1;
   ```
   Confirm `key_hash` is a 64-char lowercase hex string and `key_prefix` is the masked hint — and that there is **no** `key` column at all:
   ```sql
   PRAGMA table_info(workflow_api_keys);   -- no column named "key"
   ```
4. Confirm the raw `sk-wf-...` value from step 1 appears nowhere:
   ```bash
   sqlite3 data/sooket.db .dump | grep -F '<full-sk-wf-value>'   # expect no match
   ```
5. Confirm the legacy mirror is hashed too:
   ```sql
   SELECT api_key FROM workflows LIMIT 1;   -- a 64-hex hash, not sk-wf-...
   ```

## Steps — auth works by hash
6. Call the live API with the raw key from step 1:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer <full-sk-wf-value>" -H "Content-Type: application/json" -d '{}'
   ```
   Expect a normal execution response (200, or the workflow's own status), i.e. the key authenticates.
7. List keys and confirm only the masked hint is returned, never the raw key:
   ```bash
   curl -s http://localhost:3000/api/workflows/<slug>/api-keys
   ```
   Each entry has `key_hint` (e.g. `sk-wf-1a2b...ef90`) and no full `key` field.

## Expected result
- `workflow_api_keys` has `key_hash` (64-hex) and `key_prefix`; the plaintext `key` column does not exist after migration 014.
- The full raw key is present in the POST creation response only; it never appears in GET list responses, in `key_hash`/`key_prefix`, or anywhere in a DB dump.
- Authentication succeeds when the correct raw key is presented (handler hashes it and matches `key_hash`).
- `workflows.api_key` stores a hash, not an `sk-wf-...` value.

## Failure indicators
- A `key` (or any) column contains the raw `sk-wf-...` string.
- A DB dump / `/api/admin/backup` file contains a usable key.
- `WHERE k.key_hash = ?` is bypassed or the handler still compares the raw key by equality.
- The GET list or any non-creation response exposes the full key.
- A valid key is rejected (hash mismatch — e.g. hashing the wrong encoding).

## Severity rationale
Plaintext keys mean a single database (or backup) read compromises every API consumer of every workflow; hashing at rest is the table-stakes mitigation, so a regression here is a critical credential-exposure bug.

## Source reference
`lib/security/api-keys.ts` — `hashApiKey()` (SHA-256 hex) and `deriveKeyPrefix()` (display hint). `lib/db/migrations/014-hash-api-keys.ts` renames `key` → `key_hash`, replaces values with their hash, backfills `key_prefix`, and hashes `workflows.api_key` in place. `lib/execution-handler.ts` looks up `WHERE k.key_hash = ?` using `hashApiKey(apiKey)`. `app/api/workflows/[slug]/api-keys/route.ts` stores `hashApiKey(key)` + `deriveKeyPrefix(key)` and returns the raw key only in the 201 creation body. `app/api/workflows/route.ts` stores the hash for the default key and the `workflows.api_key` mirror.

## Notes
A fast hash (SHA-256, no salt) is deliberate: these keys are 122-bit random tokens, not guessable passwords, so a slow/salted KDF would only add per-request latency and break the O(1) hash lookup — this matches how GitHub/Stripe store tokens. The `sk-mw-*` instance management key in `settings` still has retrieve-after-create semantics and is out of scope for this spec (tracked separately). Migration 014 runs after the seed migrations (011, 013), so every pre-existing plaintext key — including the seeded example — is hashed; the example's raw key is intentionally not recoverable afterward.
