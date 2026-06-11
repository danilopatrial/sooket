---
id: SEC-13
title: Existing encrypted secrets survive the PBKDF2 iteration bump
severity: high
source_files:
  - lib/crypto.ts
  - lib/nodes/utils.ts
---

## What this tests
Verifies that raising the PBKDF2 work factor from 100,000 to 600,000 iterations is **backward compatible**: provider keys, credentials, and customer variables encrypted by an older build (at 100k) still decrypt and work after upgrading, because `decrypt` tries the current strength and then falls back to the legacy one. New values are written at 600k. The stored format is unchanged (lowercase hex of `IV || ciphertext`, no version marker).

## Prerequisites
- An install that already has encrypted data written by a pre-bump build (e.g. a global/workflow provider key, a credential, and a customer variable), then upgraded to the build under test
- `ENCRYPTION_SECRET` (and `ENCRYPTION_SALT`, if set) unchanged across the upgrade
- A workflow that consumes one of those secrets (e.g. an Anthropic node using the provider key)

## Steps — legacy data still decrypts
1. Upgrade the app to the build under test without changing `ENCRYPTION_SECRET`/`ENCRYPTION_SALT`.
2. Run a workflow whose Anthropic/HTTP node uses a provider key that was stored **before** the upgrade. Confirm it executes (the key decrypts at runtime via the 100k fallback).
3. Open the customer variables UI for a workflow that had variables before the upgrade; confirm the workflow still interpolates them correctly at execution time.

## Steps — new data uses the hardened strength
4. Add a **new** provider key / variable after the upgrade.
5. Confirm it round-trips: a workflow using it executes successfully.
6. (Optional, code-level) Confirm a value freshly encrypted by the new build decrypts, and that a value manufactured at 100k also decrypts — both paths succeed.

## Steps — wrong secret still fails
7. Restart with a different `ENCRYPTION_SECRET` and attempt to use any encrypted secret; decryption must fail (it is tried at both 600k and 100k and neither matches) rather than silently returning garbage.

## Expected result
- Pre-upgrade ciphertext (100k) decrypts and the dependent workflows keep working — no re-entry of keys required.
- New ciphertext is written at 600k and round-trips.
- A wrong `ENCRYPTION_SECRET`/`ENCRYPTION_SALT` still causes decryption to throw (no silent corruption), even with the dual-strength attempt.
- Stored ciphertext remains lowercase hex with no added prefix/marker.

## Failure indicators
- After upgrade, previously-stored provider keys/variables fail to decrypt and workflows error with "decryption failed" — a data-loss regression.
- New values are still written at 100k (the bump did not take effect).
- The dual-strength attempt makes a wrong secret appear to "succeed" (it must still fail).
- The stored format changed shape (e.g. a `v2:` prefix), breaking the "lowercase hex" contract in SEC-01.

## Severity rationale
A non-backward-compatible key-derivation change would make every previously-stored secret undecryptable on upgrade — effectively silent data loss for provider keys, credentials, and variables. High because it is an upgrade-path correctness guarantee guarding existing user data.

## Source reference
`lib/crypto.ts` — `PBKDF2_ITERATIONS` (600,000) used by `encrypt`; `decrypt` iterates `[PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS]` and only the final attempt's failure propagates; `deriveKey(secret, iterations)` is memoised per (iterations, salt, secret), so the fallback adds at most one cheap GCM attempt, not an extra derivation. `lib/nodes/utils.ts` — `decryptValue` delegates to `crypto.decrypt`, so the engine's runtime decrypt path inherits the fallback.

## Notes
The format intentionally carries no iteration marker; compatibility is achieved by trial decryption (current strength first, then legacy), which keeps the SEC-01 "lowercase hex" contract intact. A legacy value is upgraded to 600k only if it is re-encrypted (e.g. the secret is re-saved). Code-level coverage is in `__tests__/lib/crypto.test.ts` ("PBKDF2 iterations" and "deriveKey memoisation").
