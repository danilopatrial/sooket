---
id: CONTRACT-BACKUP-01
title: GET backup with valid management key downloads the DB
severity: high
source_files:
  - app/api/admin/backup/route.ts
---

## What this tests
Verifies that `GET /api/admin/backup` with a valid `Authorization: Bearer sk-mw-*` management key returns the SQLite database file as a binary download with the correct headers.

## Prerequisites
- App is running at http://localhost:3000
- A management key exists (`<mgmt-key>`); generate/retrieve it via `POST /api/account/api-key` (see CONTRACT-ACCT-01)

## Steps
1. Download with the management key:
   ```bash
   curl -si http://localhost:3000/api/admin/backup \
     -H "Authorization: Bearer <mgmt-key>" | head -20
   ```

## Expected result
- HTTP status code is `200`.
- `Content-Type: application/octet-stream`.
- `Content-Disposition: attachment; filename="sooket-YYYY-MM-DD.db"` (today's date).
- `Content-Length` equals the byte size of the returned body.
- The body is the raw SQLite file (begins with the `SQLite format 3\0` magic).

## Failure indicators
- A valid management key returns `401`.
- `Content-Type` is not `application/octet-stream`, or `Content-Disposition`/`Content-Length` is missing.
- The returned body is JSON/an error rather than the DB file.

## Severity rationale
Backup is the only built-in way to export instance data; a broken download means no recovery path for a local deployment.

## Source reference
`app/api/admin/backup/route.ts` lines 35–45 — reads `DB_PATH` via `fs.readFileSync` and returns it with octet-stream, `Content-Disposition`, and `Content-Length` headers.

## Notes
`DB_PATH` resolves from `SOOKET_DATA_DIR` (default `<cwd>/data/sooket.db`). The endpoint is gated only by the management key — there is no per-workflow scoping.
