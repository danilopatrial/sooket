---
id: EDGE-10
title: SQLite write contention is handled by busy_timeout (no SQLITE_BUSY 500s)
severity: high
source_files:
  - lib/db/index.ts
---

## What this tests
Verifies that every SQLite connection is opened with a `busy_timeout` (default 5000 ms, `SOOKET_BUSY_TIMEOUT_MS`) plus WAL journaling, so that when two connections contend for the write lock — most importantly the Next.js process and the standalone execution server sharing the same `data/sooket.db` — a contended write **waits and retries** (SQLite's native backoff) instead of immediately throwing `SQLITE_BUSY` and surfacing as an intermittent 500.

## Prerequisites
- App is running (Next.js on :3000)
- Optionally the standalone execution server (`npm run execution-server`) running against the same `SOOKET_DATA_DIR`
- An active workflow with a valid `sk-wf-*` key whose pipeline writes on each run (execution logs and/or a Rate Limiter / per-key limit counter)

## Steps — connection is configured
1. With the app running, confirm the live connection has the pragmas applied. Either:
   - Inspect via code/logs that `getDb()` runs `applyConnectionPragmas`, or
   - Open `data/sooket.db` with `sqlite3` and confirm `PRAGMA journal_mode;` reports `wal`. (Note: `busy_timeout` is per-connection and won't reflect the app's connection from a separate `sqlite3` session.)

## Steps — concurrent write load does not produce SQLITE_BUSY 500s
2. Drive concurrent executions so both the Next.js process and the execution server write to the DB at once (execution logs + rate-limit counters). For example, fire many parallel requests:
   ```bash
   for i in $(seq 1 50); do
     curl -s -o /dev/null -X POST http://localhost:3000/api/v1/chat \
       -H "Authorization: Bearer sk-wf-..." -H "Content-Type: application/json" \
       -d '{"message":"load"}' &
   done; wait
   ```
3. Observe responses and server logs: requests return their normal status (200 / the workflow's status, or 429/503 from the documented limiters) — **not** 500s whose error mentions `SQLITE_BUSY` / "database is locked".

## Steps — tunable / disable
4. Restart with `SOOKET_BUSY_TIMEOUT_MS=0` and repeat step 2 under heavy contention: now a contended write may surface `SQLITE_BUSY` immediately (no wait) — confirming the timeout is what provides the protection.
5. Restart with the default (unset) and confirm the contention errors disappear again.

## Expected result
- Every connection from `getDb()` has `busy_timeout` = `SOOKET_BUSY_TIMEOUT_MS` (default 5000), `journal_mode = wal`, and `foreign_keys = ON`.
- Under concurrent write load, contended writes wait up to `busy_timeout` and then succeed; callers do not see `SQLITE_BUSY`/"database is locked" 500s.
- With `SOOKET_BUSY_TIMEOUT_MS=0`, contended writes can fail fast (demonstrating the setting is in force).

## Failure indicators
- Concurrent executions intermittently 500 with `SQLITE_BUSY` / "database is locked".
- `PRAGMA busy_timeout` is 0 on the app connection by default (no wait configured).
- `journal_mode` is not `wal` (readers and the writer block each other).

## Severity rationale
Intermittent `SQLITE_BUSY` 500s are hard to reproduce and erode reliability of the execution path under load, especially with the optional execution server sharing the file; high because it directly affects request success rates under normal concurrency.

## Source reference
`lib/db/index.ts` — `busyTimeoutMs()` resolves `SOOKET_BUSY_TIMEOUT_MS` (default `DEFAULT_BUSY_TIMEOUT_MS` = 5000; `0` honored; invalid → default); `applyConnectionPragmas(db)` sets `PRAGMA busy_timeout`, `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`; `getDb()` calls it on every open (the singleton, used by both the Next.js process and the execution server).

## Notes
`busy_timeout` is SQLite's built-in retry/backoff and is a per-connection setting, so it cannot be carried by a one-time migration — it is applied on each open. Because `node:sqlite` is synchronous, the wait blocks that connection's call until the lock frees or the timeout elapses; WAL keeps readers unblocked meanwhile. This handles inter-connection/inter-process contention; it is not a substitute for the application-level concurrency cap (ENGINE-07) or the per-key limiter (API-08). Code-level coverage — including a real two-connection contention test proving the wait — is in `__tests__/db/connection-pragmas.test.ts`.
