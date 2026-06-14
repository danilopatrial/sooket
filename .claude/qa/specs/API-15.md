---
id: API-15
title: GET /api/health?ready=1 readiness probe round-trips the DB
severity: high
source_files:
  - app/api/health/route.ts
  - lib/db/health.ts
  - lib/security/auth.ts
---

## What this tests
Verifies that `GET /api/health?ready=1` is a real **readiness** probe — it performs a database round-trip (a `SELECT 1` read plus a `PRAGMA user_version` write) and returns HTTP **503** with `checks.db = "error"` when the DB is unreachable or not writable, while the plain `GET /api/health` liveness probe is unchanged and never touches the DB. Both stay unauthenticated.

## Prerequisites
- App is running at http://localhost:3000
- `data/sooket.db` exists and is writable (normal startup creates it)

## Steps — liveness (unchanged)
1. Send `curl -s -i http://localhost:3000/api/health`
2. Verify HTTP status **200**
3. Verify the JSON body has exactly `status`, `version`, `uptime`, `timestamp` and **no** `checks` field
4. Verify `status` is `"ok"`

## Steps — readiness, healthy DB
5. Send `curl -s -i "http://localhost:3000/api/health?ready=1"`
6. Verify HTTP status **200**
7. Verify the body includes the liveness fields **plus** `checks: { "db": "ok" }` and top-level `status: "ok"`
8. Confirm `ready=true` and a bare `?ready` behave the same as `ready=1`; `ready=0` and `ready=false` fall back to liveness (no `checks`, status 200)

## Steps — readiness, unwritable DB (the case that matters)
9. Make the database unwritable, e.g. stop the app, `chmod 0444 data/sooket.db` (and ensure the containing dir prevents WAL writes), restart, then send `curl -s -i "http://localhost:3000/api/health?ready=1"`
   - Alternatively run the process against a read-only mount / full volume.
10. Verify HTTP status **503**
11. Verify the body has `status: "error"` and `checks: { "db": "error" }`
12. Restore write permission (`chmod 0644 data/sooket.db`) and confirm `?ready=1` returns 200 again

## Steps — unauthenticated even with the gate on
13. Start with `SOOKET_AUTH_TOKEN` set. Send `GET /api/health?ready=1` **without** any `Authorization` header.
14. Verify it is **not** redirected to `/unlock` and not 401 — it returns the readiness JSON (200 or 503), because `/api/health` is exempt in `isPublicPath()`.

## Expected result
- `GET /api/health` → 200, liveness body only (`status, version, uptime, timestamp`), DB untouched.
- `GET /api/health?ready=1` (healthy) → 200, body adds `checks: { db: "ok" }`, `status: "ok"`.
- `GET /api/health?ready=1` (DB unreachable/read-only) → 503, `status: "error"`, `checks: { db: "error" }`.
- Readiness enabled by any truthy `ready` value (`1`, `true`, bare `?ready`); `0`/`false` → liveness.
- Both forms are reachable without auth even when `SOOKET_AUTH_TOKEN` is set.

## Failure indicators
- `?ready=1` returns 200 while the DB is read-only / unreachable (probe is read-only or skipped) — the core failure this guards against.
- Readiness returns 503 against a healthy DB (false negative).
- The liveness body gains a `checks` field or otherwise changes shape.
- `/api/health?ready=1` is gated (401 / redirect to `/unlock`) when `SOOKET_AUTH_TOKEN` is set.
- The probe pollutes data or changes `user_version` between calls.

## Severity rationale
Orchestrators (Docker HEALTHCHECK, k8s/Fly readiness probes, the hosted control plane) key off the HTTP status to decide whether to route traffic or restart; a readiness probe that can't distinguish "up" from "up but DB unwritable" causes traffic to be routed to a broken instance, hence high.

## Source reference
`app/api/health/route.ts` — `readinessRequested()` gates on a truthy `?ready`; readiness path calls `probeDb()` → `probeDatabaseReady(getDb())` and maps `db === "ok"` to 200 / otherwise 503 with `checks: { db }`. `lib/db/health.ts` — `probeDatabaseReady()` runs `SELECT 1` then rewrites `PRAGMA user_version` (write probe; `user_version` is unused by Sooket — migrations live in `schema_migrations`), returning `"error"` on any throw. `lib/security/auth.ts` — `isPublicPath()` exempts `/api/health` so the probe stays unauthenticated.

## Notes
The write probe rewrites `user_version` to its current value, so it detects a read-only/full-volume DB without polluting application data and is idempotent across calls. Code-level coverage: `__tests__/db/health.test.ts` (probe: healthy / read-only / closed handle) and `__tests__/api/health.test.ts` (route: liveness unchanged, readiness 200/503, truthy/falsey `ready` values, getDb-throws path).
