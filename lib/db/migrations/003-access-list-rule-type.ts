import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "003-access-list-rule-type",
  run(db: DatabaseSync) {
    const tableExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='workflow_access_lists'`
    ).get();
    if (!tableExists) return;

    const cols = db.prepare(`PRAGMA table_info(workflow_access_lists)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "rule_type")) {
      db.exec(`ALTER TABLE workflow_access_lists ADD COLUMN rule_type TEXT NOT NULL DEFAULT 'value'`);
    }
  },
};
