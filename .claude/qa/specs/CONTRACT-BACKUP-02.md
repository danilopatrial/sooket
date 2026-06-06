---
id: CONTRACT-BACKUP-02
title: GET backup with missing/invalid management key returns 401
severity: critical
source_files:
  - app/api/admin/backup/route.ts
---

## What this tests
Verifies that `GET /api/admin/backup` rejects requests with no `Authorization` header or a wrong bearer token, returning `401` and never streaming the database file.

## Prerequisites
- App is running at http://localhost:3000
- A management key has been configured (so the route's "no key configured" branch is not the one under test)

## Steps
1. No Authorization header:
   ```bash
   curl -si http://localhost:3000/api/admin/backup | head -20
   ```
2. Wrong bearer token:
   ```bash
   curl -si http://localhost:3000/api/admin/backup \
     -H "Authorization: Bearer sk-mw-not-the-real-key" | head -20
   ```

## Expected result
- Both requests return HTTP `401` with `{ "error": "Invalid or missing management key" }`.
- Neither response contains the database bytes (no `application/octet-stream`, no `Content-Disposition`).

## Failure indicators
- Either request returns `200` and streams the DB file.
- The response leaks the management key or DB path.

## Severity rationale
This endpoint exports the entire database (including encrypted secrets and all workflow data); an auth bypass is a full data-exfiltration breach.

## Source reference
`app/api/admin/backup/route.ts` lines 25–31 — extracts the bearer token and returns 401 when it is absent or `!== mgmtKey`.

## Notes
The comparison is a plain string equality against the stored `settings.api_key`. The separate "no management key configured" case also returns 401 (with a different message) — see CONTRACT-BACKUP-03.
