/**
 * Sliding-window-counter rate limiting, shared by the Rate Limiter node and the
 * per-API-key limiter so the two can't drift apart.
 *
 * A plain fixed/tumbling window resets the counter at each boundary, so a burst
 * straddling the boundary can pass up to 2× the limit. This smooths that by
 * weighting the *previous* window's count by the fraction of it still overlapping
 * the current sliding window: as the current window fills, the previous window's
 * influence decays from full to zero. The result tracks ~`limit` requests per
 * `windowMs` across boundaries without storing per-request timestamps.
 *
 * The decision is read-then-conditionally-increment against `store`. All three
 * store calls are synchronous, so a single-threaded caller (our SQLite path)
 * performs them as one atomic block with no `await` in between.
 */

export interface RateLimitStore {
  /** Count recorded for `key` in the fixed sub-window starting at `windowStart`. */
  getRateLimitCount(key: string, windowStart: number): number;
  /** Increment (and create) the counter for `key`/`windowStart`. Return is ignored. */
  incrementRateLimitCounter(key: string, windowStart: number): number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Weighted request count *including* this request (rounded up), for messaging. */
  count: number;
  /** Start of the current fixed sub-window (ms). */
  currentWindowStart: number;
  /** Start of the previous fixed sub-window (ms); must be retained for the estimate. */
  previousWindowStart: number;
}

/**
 * Apply the sliding-window limit for `key` at `nowMs`. Allows up to `limit`
 * requests per `windowMs`. On allow, increments the current sub-window; on block,
 * leaves the counters untouched (blocked traffic doesn't inflate the estimate).
 */
export function consumeSlidingWindow(
  store: RateLimitStore,
  key: string,
  nowMs: number,
  windowMs: number,
  limit: number,
): RateLimitDecision {
  const w = Math.max(1, Math.floor(windowMs));
  const lim = Math.max(1, Math.floor(limit));

  const currentWindowStart = Math.floor(nowMs / w) * w;
  const previousWindowStart = currentWindowStart - w;
  const elapsed = nowMs - currentWindowStart;
  const previousWeight = (w - elapsed) / w; // 1.0 at the boundary → 0.0 at window end

  const current = store.getRateLimitCount(key, currentWindowStart);
  const previous = store.getRateLimitCount(key, previousWindowStart);
  const weighted = current + previous * previousWeight;

  if (weighted >= lim) {
    return { allowed: false, count: Math.ceil(weighted), currentWindowStart, previousWindowStart };
  }

  store.incrementRateLimitCounter(key, currentWindowStart);
  return { allowed: true, count: Math.ceil(weighted) + 1, currentWindowStart, previousWindowStart };
}
