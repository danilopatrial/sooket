import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "010-credentials",
  run(db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name, type)
      );

      CREATE TABLE IF NOT EXISTS workflow_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL,
        credential_id INTEGER NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
        UNIQUE(workflow_id, node_id)
      );

      CREATE INDEX IF NOT EXISTS idx_workflow_credentials_workflow_id
        ON workflow_credentials (workflow_id);
    `);
  },
};
