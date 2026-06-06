import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "004-customer-variables-workflow-id",
  run(db: DatabaseSync) {
    const tableExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='customer_variables'`
    ).get();
    if (!tableExists) return;

    const cols = db.prepare(`PRAGMA table_info(customer_variables)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "workflow_id")) {
      db.exec(`
        CREATE TABLE customer_variables_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          encrypted_value TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(workflow_id, name)
        );
        DROP TABLE customer_variables;
        ALTER TABLE customer_variables_new RENAME TO customer_variables;
      `);
    }
  },
};
