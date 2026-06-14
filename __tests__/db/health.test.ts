/**
 * Database readiness probe: `probeDatabaseReady` performs a read (`SELECT 1`)
 * plus a write (`PRAGMA user_version` rewrite) and reports "ok" only when both
 * succeed — the write is what catches a reachable-but-unwritable DB.
 */
import { describe, it, expect, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { probeDatabaseReady } from "@/lib/db/health";

const created: string[] = [];

function tempDbPath(): string {
  const p = join(tmpdir(), `sooket-health-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  created.push(p);
  return p;
}

afterEach(() => {
  for (const p of created.splice(0)) {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        rmSync(p + suffix);
      } catch {
        /* ignore */
      }
    }
  }
});

describe("probeDatabaseReady", () => {
  it("returns 'ok' for a healthy read-write in-memory database", () => {
    const db = new DatabaseSync(":memory:");
    expect(probeDatabaseReady(db)).toBe("ok");
    db.close();
  });

  it("returns 'ok' for a healthy on-disk WAL database", () => {
    const db = new DatabaseSync(tempDbPath());
    db.exec("PRAGMA journal_mode = WAL");
    expect(probeDatabaseReady(db)).toBe("ok");
    db.close();
  });

  it("is idempotent — repeated probes stay 'ok' and do not change user_version", () => {
    const path = tempDbPath();
    const db = new DatabaseSync(path);
    db.exec("PRAGMA user_version = 7");
    expect(probeDatabaseReady(db)).toBe("ok");
    expect(probeDatabaseReady(db)).toBe("ok");
    const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
    expect(row.user_version).toBe(7);
    db.close();
  });

  it("returns 'error' for a read-only database (reachable but not writable)", () => {
    // Seed a real file first, then reopen it read-only.
    const path = tempDbPath();
    const seed = new DatabaseSync(path);
    seed.exec("PRAGMA user_version = 1");
    seed.close();

    const ro = new DatabaseSync(path, { readOnly: true });
    // The read alone would pass — it's the write probe that must catch this.
    expect(ro.prepare("SELECT 1").get()).toBeTruthy();
    expect(probeDatabaseReady(ro)).toBe("error");
    ro.close();
  });

  it("returns 'error' for a closed database handle", () => {
    const db = new DatabaseSync(":memory:");
    db.close();
    expect(probeDatabaseReady(db)).toBe("error");
  });

  it("does not throw on a broken handle (collapses to 'error')", () => {
    const db = new DatabaseSync(":memory:");
    db.close();
    expect(() => probeDatabaseReady(db)).not.toThrow();
  });
});
