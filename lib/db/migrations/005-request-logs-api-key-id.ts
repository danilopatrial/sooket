import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "005-request-logs-api-key-id",
  run(db: DatabaseSync) {
    const tableExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='request_logs'`
    ).get();
    if (!tableExists) return;

    const cols = db.prepare(`PRAGMA table_info(request_logs)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "api_key_id")) {
      db.exec(`ALTER TABLE request_logs ADD COLUMN api_key_id INTEGER REFERENCES workflow_api_keys(id) ON DELETE SET NULL`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_id ON request_logs (api_key_id)`);
    }
  },
};
