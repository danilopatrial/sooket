/**
 * Migration 014: API keys are hashed at rest.
 *
 * Verifies the plaintext `key` column is gone, the hash + prefix are backfilled
 * from pre-existing rows, the duplicate plaintext on workflows.api_key is
 * neutralised, and the whole migration set applies cleanly (DROP COLUMN works in
 * node:sqlite).
 */
import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "@/lib/db/run-migrations";
import { ALL_MIGRATIONS } from "@/lib/db/migrations";
import { migration as m014 } from "@/lib/db/migrations/014-hash-api-keys";
import { hashApiKey, deriveKeyPrefix } from "@/lib/security/api-keys";

/** Build the schema up to (but not including) 014, so we can seed plaintext. */
function migrateBefore014(db: DatabaseSync) {
  const upTo013 = ALL_MIGRATIONS.filter((m) => m.name !== "014-hash-api-keys");
  runMigrations(db, upTo013);
}

function colNames(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);
}

describe("migration 014 — hash API keys at rest", () => {
  it("full migration set applies cleanly and drops the plaintext key column", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(db, ALL_MIGRATIONS);
    const cols = colNames(db, "workflow_api_keys");
    expect(cols).toContain("key_hash");
    expect(cols).toContain("key_prefix");
    expect(cols).not.toContain("key");
  });

  it("backfills key_hash and key_prefix for a pre-existing plaintext key", () => {
    const db = new DatabaseSync(":memory:");
    migrateBefore014(db);

    const raw = "sk-wf-deadbeefcafebabe0123456789abcdef";
    const { lastInsertRowid: wfId } = db.prepare(
      `INSERT INTO workflows (slug, name, api_key) VALUES (?,?,?)`
    ).run("legacy-wf", "Legacy", raw) as { lastInsertRowid: number };
    db.prepare(
      `INSERT INTO workflow_api_keys (workflow_id, key, label, scopes, is_active) VALUES (?,?,?,?,1)`
    ).run(Number(wfId), raw, "Default Key", '["execute"]');

    m014.run(db);

    const row = db.prepare(
      `SELECT key_hash, key_prefix FROM workflow_api_keys WHERE workflow_id = ?`
    ).get(Number(wfId)) as { key_hash: string; key_prefix: string };

    expect(row.key_hash).toBe(hashApiKey(raw));
    expect(row.key_prefix).toBe(deriveKeyPrefix(raw));
    // The plaintext column is gone — no row can leak the raw secret.
    expect(colNames(db, "workflow_api_keys")).not.toContain("key");
  });

  it("hashes the vestigial plaintext on workflows.api_key in place", () => {
    const db = new DatabaseSync(":memory:");
    migrateBefore014(db);

    const raw = "sk-wf-0011223344556677889900aabbccddee";
    const { lastInsertRowid: wfId } = db.prepare(
      `INSERT INTO workflows (slug, name, api_key) VALUES (?,?,?)`
    ).run("legacy-wf2", "Legacy2", raw) as { lastInsertRowid: number };

    m014.run(db);

    const wf = db.prepare(`SELECT api_key FROM workflows WHERE id = ?`).get(Number(wfId)) as { api_key: string };
    expect(wf.api_key).toBe(hashApiKey(raw));
    expect(wf.api_key).not.toContain("sk-wf-");
  });

  it("a hashed key remains unique-indexed (duplicate hash insert rejected)", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(db, ALL_MIGRATIONS);

    const { lastInsertRowid: wfId } = db.prepare(
      `INSERT INTO workflows (slug, name, api_key) VALUES (?,?,?)`
    ).run("uniq-wf", "Uniq", hashApiKey("sk-wf-seed-for-uniq")) as { lastInsertRowid: number };

    const hash = hashApiKey("sk-wf-collide");
    db.prepare(
      `INSERT INTO workflow_api_keys (workflow_id, key_hash, key_prefix, label, scopes, is_active) VALUES (?,?,?,?,?,1)`
    ).run(Number(wfId), hash, "p", "A", '["execute"]');

    expect(() =>
      db.prepare(
        `INSERT INTO workflow_api_keys (workflow_id, key_hash, key_prefix, label, scopes, is_active) VALUES (?,?,?,?,?,1)`
      ).run(Number(wfId), hash, "p", "B", '["execute"]')
    ).toThrow();
  });
});
