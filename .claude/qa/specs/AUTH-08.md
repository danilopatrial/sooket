---
id: AUTH-08
title: Execution API still enforces its own sk-wf-* auth
severity: high
source_files:
  - lib/execution-handler.ts
  - lib/security/auth.ts
---

## What this tests
The shared-secret gate does not replace the per-workflow API key check on
`/api/v1/chat`. Because `/api/v1/chat` is gate-exempt, its own `sk-wf-*` auth must
still run regardless of `SOOKET_AUTH_TOKEN`.

## Prerequisites
- An active workflow with a valid `sk-wf-*` key
- Run once with `SOOKET_AUTH_TOKEN` unset and once set

## Steps
1. `POST /api/v1/chat` with no `Authorization` → expect 401 `Missing Authorization header`
2. `POST /api/v1/chat` with a bogus `sk-wf-*` → expect 401 `Invalid API key`
3. `POST /api/v1/chat` with a valid `sk-wf-*` → expect 200
4. Confirm results are identical whether or not `SOOKET_AUTH_TOKEN` is set

## Expected result
- The execution route's own auth governs access in all cases
- The gate token is neither required nor sufficient for `/api/v1/chat`

## Failure indicators
- A valid `sk-wf-*` request is blocked by the gate
- The gate token alone (without a `sk-wf-*`) is accepted by `/api/v1/chat`

## Severity rationale
Conflating the two auth schemes would either break live API callers or weaken
per-key controls (scopes, expiry, rate limits).

## Source reference
`lib/execution-handler.ts` — independent `sk-wf-*` lookup, expiry, scope, and
rate-limit checks; `/api/v1/*` is exempt in `isPublicPath()`.
