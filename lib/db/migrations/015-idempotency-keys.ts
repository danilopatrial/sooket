import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

/**
 * Idempotency keys for the live execution API. When a caller sends an
 * `Idempotency-Key` header, the first request's response is stored and replayed
 * for any retry carrying the same key, so a dropped connection or client retry
 * can't double-execute a pipeline with side effects (charges, emails, writes).
 *
 * Scoped per workflow API key (`api_key_id`) so distinct callers/workflows can
 * reuse the same key string without colliding. `request_fingerprint` (a hash of
 * the body) lets us reject a key reused with different parameters. `expires_at`
 * (ms epoch) bounds retention so the table self-cleans.
 */
export const migration: Migration = {
  name: "015-idempotency-keys",
  run(db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key_id INTEGER NOT NULL REFERENCES workflow_api_keys(id) ON DELETE CASCADE,
        idempotency_key TEXT NOT NULL,
        request_fingerprint TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        response_status INTEGER,
        response_body TEXT,
        response_headers TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at INTEGER NOT NULL,
        UNIQUE(api_key_id, idempotency_key)
      );
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
         ON idempotency_keys (expires_at)`
    );
  },
};
