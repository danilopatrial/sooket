import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";
import { randomBytes, randomUUID } from "node:crypto";
import { EXAMPLE_WORKFLOW } from "../seed/example-workflow";

export const migration: Migration = {
  name: "013-seed-example-workflow",
  run(db: DatabaseSync) {
    // Seed a ready-to-inspect example workflow so a fresh install isn't empty.
    // Runs once (tracked in schema_migrations), so it never returns after the
    // user deletes it. Seeded inactive to avoid deactivating any existing active
    // workflow and so it isn't unexpectedly live with a placeholder upstream URL.
    const exists = db.prepare(
      `SELECT 1 FROM workflows WHERE slug = ?`
    ).get(EXAMPLE_WORKFLOW.slug);
    if (exists) return;

    const apiKey = `sk-wf-${randomUUID().replace(/-/g, "")}`;
    const webhookToken = randomBytes(24).toString("hex");

    const { lastInsertRowid } = db.prepare(
      `INSERT INTO workflows (slug, name, nodes, edges, api_key, webhook_token, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).run(
      EXAMPLE_WORKFLOW.slug,
      EXAMPLE_WORKFLOW.name,
      JSON.stringify(EXAMPLE_WORKFLOW.nodes),
      JSON.stringify(EXAMPLE_WORKFLOW.edges),
      apiKey,
      webhookToken,
    );

    // Mirror the create route: every workflow gets a default sk-wf-* key row.
    db.prepare(
      `INSERT INTO workflow_api_keys (workflow_id, key, label, scopes, is_active)
       VALUES (?, ?, ?, ?, 1)`
    ).run(lastInsertRowid, apiKey, "Default Key", '["execute"]');

    // Give the sandbox something to run against out of the box.
    db.prepare(
      `INSERT INTO workflow_test_presets (workflow_id, name, body) VALUES (?, ?, ?)`
    ).run(lastInsertRowid, EXAMPLE_WORKFLOW.preset.name, EXAMPLE_WORKFLOW.preset.body);
  },
};
