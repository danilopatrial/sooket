import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";
import { hashApiKey, deriveKeyPrefix } from "../../security/api-keys";

/**
 * Stop storing `sk-wf-*` API keys in plaintext.
 *
 * Before: `workflow_api_keys.key` held the raw secret and auth looked it up by
 * equality, so a database (or `/api/admin/backup` download) leak exposed every
 * usable key. After: the column is renamed to `key_hash` and its values are
 * replaced with their SHA-256 hash, plus a non-secret display hint (`key_prefix`).
 * The legacy duplicate copy in `workflows.api_key` is hashed in place too, so no
 * plaintext key survives anywhere at rest.
 *
 * RENAME COLUMN (rather than a table rebuild) preserves the existing UNIQUE
 * constraint/index and avoids disturbing the `request_logs.api_key_id` foreign
 * key. This runs after the seed migrations (011, 013), so every plaintext row is
 * present to be hashed.
 */
export const migration: Migration = {
  name: "014-hash-api-keys",
  run(db: DatabaseSync) {
    const cols = () => db.prepare(`PRAGMA table_info(workflow_api_keys)`).all() as Array<{ name: string }>;
    const has = (c: string) => cols().some((col) => col.name === c);

    // Repurpose the plaintext column. Rename carries the UNIQUE constraint and
    // any dependent index over to the new name automatically.
    if (has("key") && !has("key_hash")) {
      db.exec(`ALTER TABLE workflow_api_keys RENAME COLUMN key TO key_hash`);
    }
    if (!has("key_prefix")) {
      db.exec(`ALTER TABLE workflow_api_keys ADD COLUMN key_prefix TEXT`);
    }

    // Replace still-plaintext values with their hash and populate the prefix.
    // Rows already holding a hash (re-run safety) don't match the 'sk-%' guard.
    const rows = db.prepare(
      `SELECT id, key_hash FROM workflow_api_keys WHERE key_hash LIKE 'sk-%'`
    ).all() as Array<{ id: number; key_hash: string }>;
    const update = db.prepare(
      `UPDATE workflow_api_keys SET key_hash = ?, key_prefix = ? WHERE id = ?`
    );
    for (const row of rows) {
      update.run(hashApiKey(row.key_hash), deriveKeyPrefix(row.key_hash), row.id);
    }

    // The pre-rename index name is stale; replace it with one that names the
    // column it now covers. (The inline UNIQUE constraint already provides an
    // index for equality lookups, so this is purely for clarity/consistency.)
    db.exec(`DROP INDEX IF EXISTS idx_workflow_api_keys_key`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_workflow_api_keys_key_hash
         ON workflow_api_keys (key_hash)`
    );

    // Neutralise the vestigial duplicate plaintext on workflows.api_key. Nothing
    // authenticates or displays it (only the one-time seed migration read it),
    // so overwriting it with the hash is safe and keeps NOT NULL / UNIQUE intact.
    const wfRows = db.prepare(
      `SELECT id, api_key FROM workflows WHERE api_key LIKE 'sk-%'`
    ).all() as Array<{ id: number; api_key: string }>;
    const updateWf = db.prepare(`UPDATE workflows SET api_key = ? WHERE id = ?`);
    for (const row of wfRows) {
      updateWf.run(hashApiKey(row.api_key), row.id);
    }
  },
};
