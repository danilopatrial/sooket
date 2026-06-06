---
id: CONTRACT-BACKUP-03
title: GET backup returns 401 when no management key is configured
severity: medium
source_files:
  - app/api/admin/backup/route.ts
---

## What this tests
Verifies that `GET /api/admin/backup` returns `401` with a guiding message when the instance has no management key configured yet, rather than serving the DB or 500-ing.

## Prerequisites
- App is running at http://localhost:3000
- The instance has **no** management key in `settings` (i.e. `POST /api/account/api-key` has never been called). On a seeded instance this may not be reproducible without a fresh DB — see Notes.

## Steps
1. With no management key configured, call:
   ```bash
   curl -si http://localhost:3000/api/admin/backup | head -20
   ```

## Expected result
- HTTP status code is `401`.
- Body is `{ "error": "No management key configured. Generate one via POST /api/account/api-key first." }`.
- The DB file is not served.

## Failure indicators
- The endpoint serves the DB file when no key is configured.
- The endpoint 500s instead of returning a clear 401.

## Severity rationale
A misconfigured instance should fail closed with a clear remedy, not expose data or crash; medium because it requires the unconfigured state to occur.

## Source reference
`app/api/admin/backup/route.ts` lines 12–23 — when `settings.api_key` is absent, returns 401 with the "No management key configured" message before any token comparison.

## Notes
This branch is only reachable before any management key has ever been generated. On an already-seeded QA instance the key exists, so this case is best verified against a fresh `SOOKET_DATA_DIR` or treated as source-reviewed if a fresh DB cannot be created safely.
