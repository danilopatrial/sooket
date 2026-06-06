import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "011-workflow-api-keys-seed",
  run(db: DatabaseSync) {
    // Seed workflow_api_keys from existing workflows.api_key values for installs
    // that pre-date the workflow_api_keys table.
    const workflows = db.prepare(
      `SELECT id, api_key FROM workflows WHERE api_key IS NOT NULL`
    ).all() as Array<{ id: number; api_key: string }>;

    const insert = db.prepare(
      `INSERT OR IGNORE INTO workflow_api_keys (workflow_id, key, label, scopes, is_active) VALUES (?, ?, ?, ?, 1)`
    );
    for (const wf of workflows) {
      insert.run(wf.id, wf.api_key, "Default Key", '["execute"]');
    }
  },
};
