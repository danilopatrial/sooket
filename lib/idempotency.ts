/**
 * Idempotency-key support for the live execution API.
 *
 * A caller opts in by sending an `Idempotency-Key` header. The first request
 * with a given (api key, key) executes and its response is stored; any retry
 * carrying the same key replays that stored response instead of re-executing,
 * so a dropped connection or client retry can't double-fire side effects. A
 * concurrent duplicate (still in progress) is rejected with 409; reusing a key
 * with a different body is rejected with 422. Records expire after a TTL.
 *
 * Storage primitives take a `DatabaseSync` so they're unit-testable against an
 * in-memory database; the synchronous calls also make reserve/complete atomic
 * for this single-threaded process.
 */
import type { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";

/** Default retention for idempotency records: 24 hours. */
export const DEFAULT_IDEMPOTENCY_TTL_MS = 86_400_000;

/** Max accepted key length (matches common gateway limits, e.g. Stripe's 255). */
export const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

export interface IdempotencyRecord {
  id: number;
  status: "in_progress" | "completed";
  request_fingerprint: string;
  response_status: number | null;
  response_body: string | null;
  response_headers: string | null;
}

/** Resolve the record TTL from `SOOKET_IDEMPOTENCY_TTL_MS` (default 24h). */
export function idempotencyTtlMs(): number {
  const raw = process.env.SOOKET_IDEMPOTENCY_TTL_MS?.trim();
  if (!raw) return DEFAULT_IDEMPOTENCY_TTL_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_IDEMPOTENCY_TTL_MS;
  return Math.floor(n);
}

/** Extract a trimmed, non-empty `Idempotency-Key` header, or null if absent. */
export function extractIdempotencyKey(headers: Headers): string | null {
  const raw = headers.get("idempotency-key");
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** SHA-256 hex of the raw request body — used to detect key reuse with a different payload. */
export function requestFingerprint(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

/**
 * Look up a live (non-expired) record for `(apiKeyId, key)`. Expired records are
 * deleted opportunistically and treated as absent.
 */
export function findIdempotencyRecord(
  db: DatabaseSync,
  apiKeyId: number,
  key: string,
  nowMs: number,
): IdempotencyRecord | null {
  const row = db.prepare(
    `SELECT id, status, request_fingerprint, response_status, response_body, response_headers, expires_at
     FROM idempotency_keys WHERE api_key_id = ? AND idempotency_key = ?`
  ).get(apiKeyId, key) as
    | (IdempotencyRecord & { expires_at: number })
    | undefined;
  if (!row) return null;
  if (row.expires_at <= nowMs) {
    db.prepare(`DELETE FROM idempotency_keys WHERE id = ?`).run(row.id);
    return null;
  }
  const { expires_at: _expires, ...record } = row;
  void _expires;
  return record;
}

/**
 * Atomically reserve `(apiKeyId, key)` as in-progress. Returns the new row id, or
 * `null` if another request already holds it (UNIQUE violation) — the caller
 * should then re-check and 409/replay.
 */
export function reserveIdempotency(
  db: DatabaseSync,
  apiKeyId: number,
  key: string,
  fingerprint: string,
  nowMs: number,
  ttlMs: number,
): number | null {
  try {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO idempotency_keys (api_key_id, idempotency_key, request_fingerprint, status, expires_at)
       VALUES (?, ?, ?, 'in_progress', ?)`
    ).run(apiKeyId, key, fingerprint, nowMs + ttlMs) as { lastInsertRowid: number | bigint };
    return Number(lastInsertRowid);
  } catch {
    return null; // UNIQUE(api_key_id, idempotency_key) — concurrent duplicate
  }
}

/** Persist the final response on a reserved record so future retries replay it. */
export function completeIdempotency(
  db: DatabaseSync,
  id: number,
  responseStatus: number,
  responseBodyJson: string,
  responseHeadersJson: string,
): void {
  db.prepare(
    `UPDATE idempotency_keys
     SET status = 'completed', response_status = ?, response_body = ?, response_headers = ?
     WHERE id = ?`
  ).run(responseStatus, responseBodyJson, responseHeadersJson, id);
}

/** Drop a reserved record (e.g. a 5xx outcome) so a retry may re-execute. */
export function releaseIdempotency(db: DatabaseSync, id: number): void {
  db.prepare(`DELETE FROM idempotency_keys WHERE id = ?`).run(id);
}

/** Delete all expired records. */
export function evictExpiredIdempotency(db: DatabaseSync, nowMs: number): void {
  db.prepare(`DELETE FROM idempotency_keys WHERE expires_at <= ?`).run(nowMs);
}
