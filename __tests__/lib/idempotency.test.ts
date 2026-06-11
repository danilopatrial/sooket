import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { ALL_MIGRATIONS } from "@/lib/db/migrations";
import { runMigrations } from "@/lib/db/run-migrations";
import {
  extractIdempotencyKey,
  requestFingerprint,
  idempotencyTtlMs,
  findIdempotencyRecord,
  reserveIdempotency,
  completeIdempotency,
  releaseIdempotency,
  evictExpiredIdempotency,
  DEFAULT_IDEMPOTENCY_TTL_MS,
} from "@/lib/idempotency";

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  runMigrations(db, ALL_MIGRATIONS);
  // A workflow + key to satisfy the api_key_id foreign key.
  const { lastInsertRowid: wfId } = db.prepare(
    `INSERT INTO workflows (slug, name, api_key, is_active) VALUES (?,?,?,1)`
  ).run("wf", "WF", "hash-x") as { lastInsertRowid: number };
  db.prepare(
    `INSERT INTO workflow_api_keys (workflow_id, key_hash, key_prefix, scopes, is_active) VALUES (?,?,?,?,1)`
  ).run(Number(wfId), "kh", "sk-wf-...", '["execute"]');
  return db;
}

const KEY_ID = 1;

describe("extractIdempotencyKey", () => {
  it("returns the trimmed key", () => {
    expect(extractIdempotencyKey(new Headers({ "Idempotency-Key": "  abc-123  " }))).toBe("abc-123");
  });
  it("is case-insensitive on the header name", () => {
    expect(extractIdempotencyKey(new Headers({ "idempotency-key": "k" }))).toBe("k");
  });
  it("returns null when absent or blank", () => {
    expect(extractIdempotencyKey(new Headers())).toBeNull();
    expect(extractIdempotencyKey(new Headers({ "Idempotency-Key": "   " }))).toBeNull();
  });
});

describe("requestFingerprint", () => {
  it("is a stable sha256 hex of the body", () => {
    expect(requestFingerprint('{"a":1}')).toBe(requestFingerprint('{"a":1}'));
    expect(requestFingerprint('{"a":1}')).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs for different bodies", () => {
    expect(requestFingerprint('{"a":1}')).not.toBe(requestFingerprint('{"a":2}'));
  });
});

describe("idempotencyTtlMs", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("defaults to 24h", () => {
    vi.stubEnv("SOOKET_IDEMPOTENCY_TTL_MS", "");
    expect(idempotencyTtlMs()).toBe(DEFAULT_IDEMPOTENCY_TTL_MS);
  });
  it("uses a positive override", () => {
    vi.stubEnv("SOOKET_IDEMPOTENCY_TTL_MS", "60000");
    expect(idempotencyTtlMs()).toBe(60000);
  });
  it.each(["0", "-1", "abc"])("falls back for invalid %p", (v) => {
    vi.stubEnv("SOOKET_IDEMPOTENCY_TTL_MS", v);
    expect(idempotencyTtlMs()).toBe(DEFAULT_IDEMPOTENCY_TTL_MS);
  });
});

describe("idempotency store", () => {
  let db: DatabaseSync;
  beforeEach(() => { db = makeDb(); });

  it("reserve → find returns an in_progress record", () => {
    const fp = requestFingerprint("{}");
    const id = reserveIdempotency(db, KEY_ID, "k1", fp, 1000, 5000);
    expect(id).not.toBeNull();
    const rec = findIdempotencyRecord(db, KEY_ID, "k1", 2000);
    expect(rec).not.toBeNull();
    expect(rec!.status).toBe("in_progress");
    expect(rec!.request_fingerprint).toBe(fp);
  });

  it("a second reserve of the same (key,api_key) returns null (concurrent duplicate)", () => {
    expect(reserveIdempotency(db, KEY_ID, "dup", "fp", 1000, 5000)).not.toBeNull();
    expect(reserveIdempotency(db, KEY_ID, "dup", "fp", 1000, 5000)).toBeNull();
  });

  it("complete stores the response and find returns it", () => {
    const id = reserveIdempotency(db, KEY_ID, "k2", "fp", 1000, 5000)!;
    completeIdempotency(db, id, 200, JSON.stringify({ reply: "ok" }), JSON.stringify({ "X-H": "1" }));
    const rec = findIdempotencyRecord(db, KEY_ID, "k2", 2000)!;
    expect(rec.status).toBe("completed");
    expect(rec.response_status).toBe(200);
    expect(JSON.parse(rec.response_body!)).toEqual({ reply: "ok" });
    expect(JSON.parse(rec.response_headers!)).toEqual({ "X-H": "1" });
  });

  it("release deletes the record so the key is free again", () => {
    const id = reserveIdempotency(db, KEY_ID, "k3", "fp", 1000, 5000)!;
    releaseIdempotency(db, id);
    expect(findIdempotencyRecord(db, KEY_ID, "k3", 2000)).toBeNull();
    // free to reserve again
    expect(reserveIdempotency(db, KEY_ID, "k3", "fp", 1000, 5000)).not.toBeNull();
  });

  it("find treats an expired record as absent and deletes it", () => {
    reserveIdempotency(db, KEY_ID, "k4", "fp", 1000, 5000); // expires_at = 6000
    expect(findIdempotencyRecord(db, KEY_ID, "k4", 7000)).toBeNull(); // now past expiry
    // and the row was removed, so the key can be reserved fresh
    expect(reserveIdempotency(db, KEY_ID, "k4", "fp", 8000, 5000)).not.toBeNull();
  });

  it("evictExpiredIdempotency removes only expired rows", () => {
    reserveIdempotency(db, KEY_ID, "old", "fp", 0, 1000);      // expires 1000
    reserveIdempotency(db, KEY_ID, "new", "fp", 0, 100000);    // expires 100000
    evictExpiredIdempotency(db, 5000);
    expect(findIdempotencyRecord(db, KEY_ID, "old", 5000)).toBeNull();
    expect(findIdempotencyRecord(db, KEY_ID, "new", 5000)).not.toBeNull();
  });

  it("scopes keys per api_key_id (same string, different key → no collision)", () => {
    // second api key
    const { lastInsertRowid: wf2 } = db.prepare(
      `INSERT INTO workflows (slug, name, api_key, is_active) VALUES (?,?,?,1)`
    ).run("wf2", "WF2", "hash-y") as { lastInsertRowid: number };
    db.prepare(
      `INSERT INTO workflow_api_keys (workflow_id, key_hash, key_prefix, scopes, is_active) VALUES (?,?,?,?,1)`
    ).run(Number(wf2), "kh2", "sk-wf-...", '["execute"]');
    const keyId2 = 2;
    expect(reserveIdempotency(db, KEY_ID, "shared", "fp", 1000, 5000)).not.toBeNull();
    expect(reserveIdempotency(db, keyId2, "shared", "fp", 1000, 5000)).not.toBeNull();
  });
});
