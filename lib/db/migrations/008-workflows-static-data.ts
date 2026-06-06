import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "008-workflows-static-data",
  run(db: DatabaseSync) {
    const cols = db.prepare(`PRAGMA table_info(workflows)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "static_data")) {
      db.exec(`ALTER TABLE workflows ADD COLUMN static_data TEXT`);
    }
  },
};
