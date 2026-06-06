import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { binaryDataService } from "@/lib/binary-data";
import { runMigrations } from "./run-migrations";
import { ALL_MIGRATIONS } from "./migrations";
import { migration as credentialsMigration } from "./migrations/010-credentials";

/** Exported for tests that spin up in-memory SQLite databases. */
export function migrateCredentials(db: DatabaseSync): void {
  credentialsMigration.run(db);
}

const DATA_DIR = process.env.SOOKET_DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "sooket.db");

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new DatabaseSync(DB_PATH);
  initSchema(_db);
  binaryDataService.cleanup();
  return _db;
}

function initSchema(db: DatabaseSync) {
  runMigrations(db, ALL_MIGRATIONS);
}
