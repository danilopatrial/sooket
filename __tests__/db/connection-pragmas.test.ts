/**
 * Connection PRAGMAs: SQLite busy_timeout (write-contention handling) plus the
 * WAL / foreign_keys assertions applied on every connection open.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import {
  busyTimeoutMs,
  applyConnectionPragmas,
  DEFAULT_BUSY_TIMEOUT_MS,
} from "@/lib/db";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("busyTimeoutMs", () => {
  it("defaults to 5000 when unset", () => {
    vi.stubEnv("SOOKET_BUSY_TIMEOUT_MS", undefined as unknown as string);
    expect(busyTimeoutMs()).toBe(DEFAULT_BUSY_TIMEOUT_MS);
    expect(busyTimeoutMs()).toBe(5000);
  });

  it("uses a positive numeric override", () => {
    vi.stubEnv("SOOKET_BUSY_TIMEOUT_MS", "8000");
    expect(busyTimeoutMs()).toBe(8000);
  });

  it("honors 0 (fail immediately, no wait)", () => {
    vi.stubEnv("SOOKET_BUSY_TIMEOUT_MS", "0");
    expect(busyTimeoutMs()).toBe(0);
  });

  it("floors fractional values", () => {
    vi.stubEnv("SOOKET_BUSY_TIMEOUT_MS", "1500.9");
    expect(busyTimeoutMs()).toBe(1500);
  });

  it.each(["", "  ", "abc", "-1", "NaN"])(
    "falls back to the default for invalid value %p",
    (v) => {
      vi.stubEnv("SOOKET_BUSY_TIMEOUT_MS", v);
      expect(busyTimeoutMs()).toBe(DEFAULT_BUSY_TIMEOUT_MS);
    },
  );
});

describe("applyConnectionPragmas", () => {
  const made: string[] = [];
  function tempDb(): DatabaseSync {
    const p = join(tmpdir(), `sk-pragmas-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    made.push(p);
    return new DatabaseSync(p);
  }
  afterEach(() => {
    for (const p of made.splice(0)) {
      for (const suffix of ["", "-wal", "-shm"]) {
        try { rmSync(p + suffix); } catch { /* ignore */ }
      }
    }
  });

  it("sets busy_timeout to the configured value", () => {
    vi.stubEnv("SOOKET_BUSY_TIMEOUT_MS", "4321");
    const db = tempDb();
    applyConnectionPragmas(db);
    expect((db.prepare("PRAGMA busy_timeout").get() as { timeout: number }).timeout).toBe(4321);
    db.close();
  });

  it("applies the default busy_timeout when unset", () => {
    vi.stubEnv("SOOKET_BUSY_TIMEOUT_MS", "");
    const db = tempDb();
    applyConnectionPragmas(db);
    expect((db.prepare("PRAGMA busy_timeout").get() as { timeout: number }).timeout).toBe(5000);
    db.close();
  });

  it("enables WAL journal mode (concurrent readers + single writer)", () => {
    const db = tempDb();
    applyConnectionPragmas(db);
    expect((db.prepare("PRAGMA journal_mode").get() as { journal_mode: string }).journal_mode).toBe("wal");
    db.close();
  });

  it("enables foreign key enforcement", () => {
    const db = tempDb();
    applyConnectionPragmas(db);
    expect((db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number }).foreign_keys).toBe(1);
    db.close();
  });

  it("is idempotent across repeated applications", () => {
    vi.stubEnv("SOOKET_BUSY_TIMEOUT_MS", "2500");
    const db = tempDb();
    applyConnectionPragmas(db);
    applyConnectionPragmas(db);
    expect((db.prepare("PRAGMA busy_timeout").get() as { timeout: number }).timeout).toBe(2500);
    expect((db.prepare("PRAGMA journal_mode").get() as { journal_mode: string }).journal_mode).toBe("wal");
    db.close();
  });
});

describe("busy_timeout under real write contention", () => {
  const files: string[] = [];
  function tempPath(): string {
    const p = join(tmpdir(), `sk-busy-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    files.push(p);
    return p;
  }
  afterEach(() => {
    for (const p of files.splice(0)) {
      for (const suffix of ["", "-wal", "-shm"]) {
        try { rmSync(p + suffix); } catch { /* ignore */ }
      }
    }
  });

  it("a second writer WAITS (~busy_timeout) instead of failing immediately when the lock is held", () => {
    const path = tempPath();

    // Connection A: WAL + hold the write lock with an open IMMEDIATE transaction.
    const a = new DatabaseSync(path);
    applyConnectionPragmas(a);
    a.exec(`CREATE TABLE t (x INTEGER)`);
    a.exec(`BEGIN IMMEDIATE`);
    a.exec(`INSERT INTO t VALUES (1)`); // now A holds the write lock

    try {
      // No-wait connection: should fail (SQLITE_BUSY) effectively immediately.
      const noWait = new DatabaseSync(path);
      noWait.exec(`PRAGMA busy_timeout = 0`);
      const t0 = Date.now();
      expect(() => noWait.exec(`INSERT INTO t VALUES (2)`)).toThrow();
      expect(Date.now() - t0).toBeLessThan(150);
      noWait.close();

      // Waiting connection: busy_timeout makes SQLite retry the lock for ~200ms
      // before giving up (A never commits within this synchronous flow, so it
      // still ends up throwing — but only after waiting, which is the point).
      const waiter = new DatabaseSync(path);
      waiter.exec(`PRAGMA busy_timeout = 200`);
      const t1 = Date.now();
      expect(() => waiter.exec(`INSERT INTO t VALUES (3)`)).toThrow();
      const waited = Date.now() - t1;
      expect(waited).toBeGreaterThanOrEqual(120); // it actually waited (native retry/backoff)
      waiter.close();
    } finally {
      a.exec(`ROLLBACK`);
      a.close();
    }
  });
});
