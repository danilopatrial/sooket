---
id: API-14
title: Idempotency-Key makes POST /api/v1/chat safe to retry
severity: high
source_files:
  - lib/idempotency.ts
  - lib/execution-handler.ts
  - lib/db/migrations/015-idempotency-keys.ts
---

## What this tests
Verifies that when a caller sends an `Idempotency-Key` header on `POST /api/v1/chat`, the first request executes and its response is stored; a retry with the same key **replays** that stored response without re-executing the workflow (no duplicate side effects). Reusing a key with a different body returns 422; a still-in-flight duplicate returns 409; server errors (5xx) are not cached so they can be retried. Records are scoped per API key and expire after a TTL (`SOOKET_IDEMPOTENCY_TTL_MS`, default 24h).

## Prerequisites
- App is running at http://localhost:3000
- A valid `sk-wf-*` key for an active workflow that has an observable side effect or a deterministic reply

## Steps — replay
1. Send a request with an idempotency key:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-..." -H "Content-Type: application/json" \
     -H "Idempotency-Key: demo-1" -d '{"message":"hello"}'
   ```
2. Send the **same** request again (same key, same body). Confirm:
   - identical status and body to step 1,
   - the response carries `Idempotency-Replayed: true`,
   - the workflow did **not** run a second time (no duplicate side effect; execution logs show one run).

## Steps — reuse with a different body (422)
3. Send a request with key `demo-1` but a **different** body (e.g. `{"message":"other"}`). Confirm HTTP **422** with an error mentioning the key was reused with a different request body.

## Steps — concurrent / in-progress (409)
4. Start a slow execution with key `demo-2`, and while it is still running send a second request with the same key. Confirm the second returns HTTP **409** (a request with this key is already in progress) rather than executing concurrently.

## Steps — server errors are not cached
5. Cause the workflow to fail with a 5xx (e.g. a runtime error in a node). Send it with key `demo-3` → 500.
6. Fix the condition and retry with the same key `demo-3`. Confirm it **re-executes** and can now succeed (the failed attempt was not cached).

## Steps — over-long key
7. Send a request with an `Idempotency-Key` longer than 255 characters → HTTP **400**.

## Steps — no key = unchanged behavior
8. Send repeated requests **without** an `Idempotency-Key`. Each executes normally; no idempotency record is created.

## Expected result
- Same key + same body → first executes; retry replays the stored status/body with `Idempotency-Replayed: true`, no re-execution.
- Same key + different body → 422.
- Same key while the first is in progress → 409.
- 5xx outcomes are not cached; a retry re-executes.
- Keys > 255 chars → 400.
- No key → current behavior, no record stored.
- Keys are scoped per API key (the same string under a different key does not collide) and expire after the TTL.

## Failure indicators
- A retry with the same key re-executes the workflow (duplicate side effects).
- A different body under the same key returns a (possibly wrong) replayed result instead of 422.
- Concurrent duplicates both execute instead of one getting 409.
- A 5xx is cached and replayed forever, blocking legitimate retries.
- The replay omits `Idempotency-Replayed: true`.

## Severity rationale
Without idempotency, any client retry of a non-idempotent pipeline (charging a card, sending an email, writing downstream) double-fires; safe retries are table stakes for an execution API.

## Source reference
`lib/idempotency.ts` — `extractIdempotencyKey`, `requestFingerprint`, `findIdempotencyRecord` (drops expired), `reserveIdempotency` (UNIQUE-insert concurrency guard), `completeIdempotency` / `releaseIdempotency`, `idempotencyTtlMs`. `lib/execution-handler.ts` — replay check before rate-limit/semaphore; reserve after acquiring a slot (409/replay on UNIQUE conflict); `finalize()` persists `< 500` outcomes and releases `>= 500`; replay sets `Idempotency-Replayed`. `lib/db/migrations/015-idempotency-keys.ts` — the `idempotency_keys` table, `UNIQUE(api_key_id, idempotency_key)`, `expires_at` index.

## Notes
The record is reserved only after the request passes auth, rate limiting, and acquires an execution slot, so a replay returns the cached result without consuming quota or a slot. The reserve→execute→complete calls are synchronous SQLite operations, so the check is atomic for this single-threaded process. Code-level coverage: `__tests__/lib/idempotency.test.ts` (store primitives) and `__tests__/api/chat.test.ts` ("handleExecutionRequest — idempotency keys").
