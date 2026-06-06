import type { DatabaseSync } from "node:sqlite";

export interface Migration {
  name: string;
  run(db: DatabaseSync): void;
}

const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export function runMigrations(db: DatabaseSync, migrations: Migration[]): void {
  db.exec(MIGRATIONS_TABLE_SQL);

  const applied = new Set(
    (db.prepare(`SELECT name FROM schema_migrations`).all() as Array<{ name: string }>)
      .map((r) => r.name)
  );

  const insert = db.prepare(
    `INSERT INTO schema_migrations (name) VALUES (?)`
  );

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;
    migration.run(db);
    insert.run(migration.name);
  }
}
