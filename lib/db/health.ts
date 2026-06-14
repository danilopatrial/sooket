import type { DatabaseSync } from "node:sqlite";

/** Result of a single readiness sub-check. Orchestrators key off these. */
export type DbCheckResult = "ok" | "error";

/**
 * Probe the database for **readiness** (not just liveness).
 *
 * Two steps, both required to pass:
 * 1. A trivial read (`SELECT 1`) — confirms the connection is open and the file
 *    is reachable/queryable.
 * 2. A trivial write (rewrite `PRAGMA user_version` to its current value) —
 *    confirms the database is actually *writable*. This is the step that
 *    distinguishes "DB reachable" from "DB usable": a read-only mount, a full
 *    volume, or a locked file all pass the read but fail the write, which is
 *    exactly the condition an orchestrator must see before routing traffic.
 *
 * `user_version` is a 32-bit integer stored in the SQLite file header that
 * Sooket does not otherwise use — applied migrations are tracked in the
 * `schema_migrations` table, not here — so rewriting it to the same value is a
 * genuine header write that pollutes no application data and needs no table.
 *
 * Never throws: any failure (closed handle, read-only DB, corruption) is
 * collapsed to `"error"` so the caller can map it to an HTTP status.
 */
export function probeDatabaseReady(db: DatabaseSync): DbCheckResult {
  try {
    db.prepare("SELECT 1").get();
    const row = db.prepare("PRAGMA user_version").get() as
      | { user_version?: number }
      | undefined;
    const current =
      typeof row?.user_version === "number" && Number.isInteger(row.user_version)
        ? row.user_version
        : 0;
    db.exec(`PRAGMA user_version = ${current}`);
    return "ok";
  } catch {
    return "error";
  }
}
