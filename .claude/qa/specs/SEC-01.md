---
id: SEC-01
title: Provider keys and credentials stored encrypted AES-GCM PBKDF2
severity: critical
source_files:
  - lib/crypto.ts
---

## What this tests
Verifies that provider keys and credentials stored in the database are encrypted using AES-GCM with PBKDF2-derived keys — and that the raw plaintext values cannot be read directly from the SQLite database without the `ENCRYPTION_SECRET`.

## Steps — verify encryption at rest

1. Add a provider key via Config → Provider Keys tab (e.g. set an Anthropic API key)
2. Open the SQLite database directly: `sqlite3 data/sooket.db`
3. Query the stored value:
   ```sql
   SELECT encrypted_value FROM workflow_provider_keys LIMIT 1;
   ```
4. Verify the stored value is a lowercase hexadecimal string — not the plaintext API key
5. Verify the hex string is longer than the plaintext (due to 12-byte IV + authentication tag overhead)

## Steps — verify decryption works at runtime

6. Configure a workflow with a provider key set; run a Debug request that exercises that key
7. Verify the workflow executes successfully (decryption is transparent at runtime)

## Steps — wrong secret fails decryption

8. Stop the app; restart with a different `ENCRYPTION_SECRET` value
9. Attempt to run a workflow using the provider key — decryption should fail (AES-GCM authentication tag mismatch)
10. Verify the workflow returns an error rather than using a silently corrupted key

## Steps — verify algorithm parameters

11. Inspect `lib/crypto.ts` to confirm the parameters:
    - Algorithm: AES-GCM
    - Key length: 256 bits
    - PBKDF2 salt: resolved by `getEncryptionSalt()` from the `ENCRYPTION_SALT` env
      var, falling back to `"sooket-salt"` when unset or empty (legacy/back-compat
      default). The same resolver is used by `lib/nodes/utils.ts` so encrypt and
      decrypt always agree within a deployment
    - PBKDF2 iterations: 600,000 for all new encryptions (`PBKDF2_ITERATIONS`,
      OWASP 2023 floor); `decrypt` also tries 100,000 (`LEGACY_PBKDF2_ITERATIONS`)
      so data written before the bump still reads. See SEC-13.
    - PBKDF2 hash: SHA-256
    - Derived keys are memoised per (iterations, salt, secret), so raising the
      iteration count does not add per-operation cost (one derivation per process)
    - IV: 12 bytes (randomly generated per encryption)
    - Stored format: lowercase hex string of `IV (12 bytes) || ciphertext`

## Steps — verify deployment-unique salt

12. In a production configuration, confirm `ENCRYPTION_SALT` is set to a
    deployment-unique value (i.e. the effective salt is **not** the bare default
    `"sooket-salt"`). Two installs sharing an `ENCRYPTION_SECRET` but using the
    default salt would derive identical keys and produce identical ciphertext for
    identical plaintext — a cross-instance key-reuse risk
13. Confirm round-trip still works after setting `ENCRYPTION_SALT`: data encrypted
    with a given `ENCRYPTION_SALT` decrypts only while that same salt is configured.
    Changing `ENCRYPTION_SALT` on an existing install makes previously stored
    ciphertext undecryptable (the salt must stay stable for the life of the data)

## Expected result
- All `encrypted_value` columns in SQLite contain hex-encoded ciphertext, not plaintext
- Correct `ENCRYPTION_SECRET` → decryption succeeds
- Wrong `ENCRYPTION_SECRET` → decryption fails (no silent corruption)
- IV is unique per encryption (12 random bytes prepended)
- Salt is `ENCRYPTION_SALT` when set (non-empty), else the `"sooket-salt"` default; the same value is used for both encryption and decryption across `lib/crypto.ts` and `lib/nodes/utils.ts`

## Failure indicators
- Raw API keys visible as plaintext in the SQLite database
- Two encryptions of the same value produce identical hex strings (IV reuse)
- Wrong secret silently produces garbage plaintext instead of failing
- Production deployment leaves the salt at the bare default `"sooket-salt"` (no `ENCRYPTION_SALT` configured)
- `lib/crypto.ts` and `lib/nodes/utils.ts` resolve the salt differently, so data encrypted by one cannot be decrypted by the other

## Severity rationale
Provider API keys grant direct access to third-party services (Anthropic, Pinecone, etc.); plaintext storage would expose all keys to anyone with database read access.

## Source reference
`lib/crypto.ts` (AES-GCM algorithm, `getEncryptionSalt()` resolving the PBKDF2 salt from `ENCRYPTION_SALT` with a `"sooket-salt"` fallback, memoised PBKDF2 key derivation at `PBKDF2_ITERATIONS` = 600,000 + SHA-256 with a 100,000-iteration legacy fallback in `decrypt`, 12-byte random IV, hex encoding of `IV || ciphertext`); `lib/nodes/utils.ts` (`decryptValue` now delegates to `crypto.decrypt`, so the runtime decrypt path inherits the same salt, iteration fallback, and key cache).
