import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";
import { randomBytes } from "node:crypto";

export const migration: Migration = {
  name: "012-workflow-webhook-token",
  run(db: DatabaseSync) {
    const cols = db.prepare(`PRAGMA table_info(workflows)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "webhook_token")) {
      db.exec(`ALTER TABLE workflows ADD COLUMN webhook_token TEXT`);
    }

    // Populate token for any workflow that doesn't have one yet.
    const missing = db.prepare(
      `SELECT id FROM workflows WHERE webhook_token IS NULL`
    ).all() as Array<{ id: number }>;

    const update = db.prepare(`UPDATE workflows SET webhook_token = ? WHERE id = ?`);
    for (const row of missing) {
      update.run(randomBytes(24).toString("hex"), row.id);
    }
  },
};
