import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "002-preset-headers-query",
  run(db: DatabaseSync) {
    const tableExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='workflow_test_presets'`
    ).get();
    if (!tableExists) return;

    const cols = db.prepare(`PRAGMA table_info(workflow_test_presets)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "headers")) {
      db.exec(`ALTER TABLE workflow_test_presets ADD COLUMN headers TEXT`);
    }
    if (!cols.some((c) => c.name === "query")) {
      db.exec(`ALTER TABLE workflow_test_presets ADD COLUMN query TEXT`);
    }
  },
};
