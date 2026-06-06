import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "009-workflow-versions",
  run(db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        nodes TEXT NOT NULL,
        edges TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions (workflow_id);
    `);
  },
};
