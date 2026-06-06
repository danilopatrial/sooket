import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "006-workflows-error-workflow-id",
  run(db: DatabaseSync) {
    const cols = db.prepare(`PRAGMA table_info(workflows)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "error_workflow_id")) {
      db.exec(`ALTER TABLE workflows ADD COLUMN error_workflow_id INTEGER REFERENCES workflows(id) ON DELETE SET NULL`);
    }
  },
};
