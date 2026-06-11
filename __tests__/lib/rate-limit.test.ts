import { describe, it, expect } from "vitest";
import { consumeSlidingWindow, type RateLimitStore } from "@/lib/rate-limit";

/** In-memory store keyed by `${key}:${windowStart}`. */
function memStore(): RateLimitStore & { dump(): Record<string, number> } {
  const m = new Map<string, number>();
  return {
    getRateLimitCount: (key, windowStart) => m.get(`${key}:${windowStart}`) ?? 0,
    incrementRateLimitCounter: (key, windowStart) => {
      const k = `${key}:${windowStart}`;
      const n = (m.get(k) ?? 0) + 1;
      m.set(k, n);
      return n;
    },
    dump: () => Object.fromEntries(m),
  };
}

const WINDOW = 10_000; // 10s
const LIMIT = 5;

describe("consumeSlidingWindow", () => {
  it("allows exactly `limit` requests in an empty window, then blocks", () => {
    const store = memStore();
    const t0 = 1_000_000; // arbitrary window-aligned-ish start
    const results = [];
    for (let i = 0; i < LIMIT + 2; i++) {
      results.push(consumeSlidingWindow(store, "k", t0 + i, WINDOW, LIMIT).allowed);
    }
    expect(results.filter(Boolean).length).toBe(LIMIT);
    expect(results.slice(LIMIT)).toEqual([false, false]);
  });

  it("does not increment counters on a blocked request", () => {
    const store = memStore();
    const now = 5_000;
    for (let i = 0; i < LIMIT; i++) consumeSlidingWindow(store, "k", now, WINDOW, LIMIT);
    const before = store.dump();
    consumeSlidingWindow(store, "k", now, WINDOW, LIMIT); // blocked
    expect(store.dump()).toEqual(before);
  });

  it("closes the fixed-window boundary burst (no 2x across adjacent windows)", () => {
    const store = memStore();
    // Fill the limit right at the end of window 0.
    const endOfW0 = WINDOW - 1; // elapsed 9999 in window 0
    for (let i = 0; i < LIMIT; i++) {
      expect(consumeSlidingWindow(store, "k", endOfW0, WINDOW, LIMIT).allowed).toBe(true);
    }
    // Immediately at the start of window 1, the previous window is weighted ~fully,
    // so a fresh burst is blocked rather than allowing another full `limit`.
    const startOfW1 = WINDOW; // elapsed 0 in window 1, previousWeight ≈ 1.0
    expect(consumeSlidingWindow(store, "k", startOfW1, WINDOW, LIMIT).allowed).toBe(false);
  });

  it("lets capacity recover as the previous window decays", () => {
    const store = memStore();
    const endOfW0 = WINDOW - 1;
    for (let i = 0; i < LIMIT; i++) consumeSlidingWindow(store, "k", endOfW0, WINDOW, LIMIT);
    // Halfway through window 1, previousWeight ≈ 0.5 → ~half the previous window
    // counts, leaving room for ~limit/2 new requests.
    const midW1 = WINDOW + WINDOW / 2;
    let allowed = 0;
    for (let i = 0; i < LIMIT; i++) {
      if (consumeSlidingWindow(store, "k", midW1, WINDOW, LIMIT).allowed) allowed++;
    }
    expect(allowed).toBeGreaterThan(0);
    expect(allowed).toBeLessThan(LIMIT);
  });

  it("isolates different keys", () => {
    const store = memStore();
    const now = 3_333;
    for (let i = 0; i < LIMIT; i++) consumeSlidingWindow(store, "a", now, WINDOW, LIMIT);
    expect(consumeSlidingWindow(store, "a", now, WINDOW, LIMIT).allowed).toBe(false);
    expect(consumeSlidingWindow(store, "b", now, WINDOW, LIMIT).allowed).toBe(true);
  });

  it("reports current and previous window starts and a weighted count", () => {
    const store = memStore();
    const now = 25_000; // currentWindowStart = 20000, previous = 10000
    const d = consumeSlidingWindow(store, "k", now, WINDOW, LIMIT);
    expect(d.currentWindowStart).toBe(20_000);
    expect(d.previousWindowStart).toBe(10_000);
    expect(d.count).toBe(1); // first request → weighted 0, +1
  });

  it("clamps non-positive window/limit to a sane minimum", () => {
    const store = memStore();
    // limit floored to 1 → first allowed, second blocked
    expect(consumeSlidingWindow(store, "k", 0, 0, 0).allowed).toBe(true);
    expect(consumeSlidingWindow(store, "k", 0, 0, 0).allowed).toBe(false);
  });
});
