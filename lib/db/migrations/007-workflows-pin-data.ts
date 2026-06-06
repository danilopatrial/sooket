import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "007-workflows-pin-data",
  run(db: DatabaseSync) {
    const cols = db.prepare(`PRAGMA table_info(workflows)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "pin_data")) {
      db.exec(`ALTER TABLE workflows ADD COLUMN pin_data TEXT`);
    }
  },
};
