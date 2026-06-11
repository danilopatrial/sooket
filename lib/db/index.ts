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

/** Default SQLite busy-wait before a contended write gives up: 5 seconds. */
export const DEFAULT_BUSY_TIMEOUT_MS = 5000;

/**
 * Resolve the SQLite `busy_timeout` from `SOOKET_BUSY_TIMEOUT_MS`, defaulting to
 * {@link DEFAULT_BUSY_TIMEOUT_MS}. `0` is honored (fail immediately, no wait);
 * a missing, empty, non-numeric, or negative value falls back to the default.
 */
export function busyTimeoutMs(): number {
  const raw = process.env.SOOKET_BUSY_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_BUSY_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_BUSY_TIMEOUT_MS;
  return Math.floor(n);
}

/**
 * Per-connection PRAGMAs that must be (re)applied on every open.
 *
 * - `busy_timeout` is SQLite's built-in retry/backoff: when another connection
 *   holds the write lock — e.g. the standalone execution server sharing the same
 *   file — SQLite sleeps and retries for up to this long instead of throwing
 *   `SQLITE_BUSY` straight away. It is a connection setting (not persisted), so a
 *   one-time migration can't carry it; it must be set here on each open.
 * - `journal_mode = WAL` lets readers run concurrently with the single writer.
 *   WAL is persisted in the file, but we assert it so a database created outside
 *   migration 001 still gets the right concurrency model.
 * - `foreign_keys = ON` is likewise a per-connection setting we re-assert.
 */
export function applyConnectionPragmas(db: DatabaseSync): void {
  db.exec(`PRAGMA busy_timeout = ${busyTimeoutMs()}`);
  db.exec(`PRAGMA journal_mode = WAL`);
  db.exec(`PRAGMA foreign_keys = ON`);
}

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new DatabaseSync(DB_PATH);
  applyConnectionPragmas(_db);
  initSchema(_db);
  binaryDataService.cleanup();
  return _db;
}

function initSchema(db: DatabaseSync) {
  runMigrations(db, ALL_MIGRATIONS);
}
