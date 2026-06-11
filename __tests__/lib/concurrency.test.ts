import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ExecutionSemaphore } from "@/lib/concurrency";

function makeSemaphore(max: number, maxQueue: number) {
  return new ExecutionSemaphore(max, maxQueue);
}

describe("ExecutionSemaphore", () => {
  let sem: ExecutionSemaphore;

  beforeEach(() => {
    sem = makeSemaphore(2, 3);
  });

  it("resolves immediately when below max", async () => {
    const result = await sem.acquire();
    expect(result).toBe(true);
    expect(sem.activeCount).toBe(1);
    expect(sem.queueDepth).toBe(0);
  });

  it("all acquisitions below max succeed concurrently", async () => {
    const results = await Promise.all([sem.acquire(), sem.acquire()]);
    expect(results).toEqual([true, true]);
    expect(sem.activeCount).toBe(2);
    expect(sem.queueDepth).toBe(0);
  });

  it("queues when at max and resolves after release", async () => {
    await sem.acquire();
    await sem.acquire();
    expect(sem.activeCount).toBe(2);

    const pending = sem.acquire();
    expect(sem.queueDepth).toBe(1);
    expect(sem.activeCount).toBe(2);

    sem.release();
    const result = await pending;
    expect(result).toBe(true);
    expect(sem.activeCount).toBe(2);
    expect(sem.queueDepth).toBe(0);
  });

  it("returns false when max and maxQueue are both saturated", async () => {
    const s = makeSemaphore(1, 2);
    await s.acquire();             // fills running slot
    s.acquire();                   // queue slot 1 (not awaited — stays pending)
    s.acquire();                   // queue slot 2 (not awaited — stays pending)
    expect(s.queueDepth).toBe(2);

    const overflow = await s.acquire(); // queue is full
    expect(overflow).toBe(false);
  });

  it("activeCount and queueDepth are accurate at each stage", async () => {
    const s = makeSemaphore(2, 5);

    expect(s.activeCount).toBe(0);
    expect(s.queueDepth).toBe(0);

    await s.acquire();
    expect(s.activeCount).toBe(1);

    await s.acquire();
    expect(s.activeCount).toBe(2);

    const p1 = s.acquire();
    const p2 = s.acquire();
    expect(s.queueDepth).toBe(2);
    expect(s.activeCount).toBe(2);

    s.release();
    await p1;
    expect(s.activeCount).toBe(2);
    expect(s.queueDepth).toBe(1);

    s.release();
    await p2;
    expect(s.activeCount).toBe(2);
    expect(s.queueDepth).toBe(0);
  });

  it("release below zero does not underflow", () => {
    sem.release();
    expect(sem.activeCount).toBe(0);
  });

  it("maxQueue=0 immediately returns false when at max", async () => {
    const s = makeSemaphore(1, 0);
    await s.acquire();
    const result = await s.acquire();
    expect(result).toBe(false);
  });

  it("max=1 serialises concurrent callers", async () => {
    const s = makeSemaphore(1, 10);
    const order: number[] = [];

    await s.acquire();
    const p1 = s.acquire().then((ok) => { order.push(1); return ok; });
    const p2 = s.acquire().then((ok) => { order.push(2); return ok; });

    s.release();
    await p1;
    expect(order).toEqual([1]);

    s.release();
    await p2;
    expect(order).toEqual([1, 2]);
  });

  it("queueTimeoutMs defaults to 0 (wait forever) for two-arg construction", () => {
    const s = new ExecutionSemaphore(1, 5);
    expect(s.queueTimeoutMs).toBe(0);
  });

  describe("queue-wait timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves false when a queued waiter exceeds queueTimeoutMs", async () => {
      const s = new ExecutionSemaphore(1, 5, 1000);
      await s.acquire();           // fills the only slot
      const pending = s.acquire(); // queues, will time out
      expect(s.queueDepth).toBe(1);

      await vi.advanceTimersByTimeAsync(1000);

      expect(await pending).toBe(false);
      // The timed-out waiter is removed, freeing its queue slot.
      expect(s.queueDepth).toBe(0);
    });

    it("a waiter granted a slot before its timeout never times out", async () => {
      const s = new ExecutionSemaphore(1, 5, 1000);
      await s.acquire();
      const pending = s.acquire();

      // Release before the timeout fires — the waiter is granted true.
      s.release();
      expect(await pending).toBe(true);

      // Advancing past the deadline must NOT double-settle or corrupt counts.
      await vi.advanceTimersByTimeAsync(2000);
      expect(s.activeCount).toBe(1);
      expect(s.queueDepth).toBe(0);
    });

    it("a timed-out waiter does not consume a slot on later release", async () => {
      const s = new ExecutionSemaphore(1, 5, 1000);
      await s.acquire();
      const timedOut = s.acquire();

      await vi.advanceTimersByTimeAsync(1000);
      expect(await timedOut).toBe(false);

      // The active holder releases. With no live waiters, the slot should free
      // up completely rather than being handed to the dead entry.
      s.release();
      expect(s.activeCount).toBe(0);
      expect(s.queueDepth).toBe(0);

      // A fresh caller can immediately acquire.
      expect(await s.acquire()).toBe(true);
    });

    it("only the timed-out waiter is dropped; earlier-released waiters still run", async () => {
      const s = new ExecutionSemaphore(1, 5, 1000);
      await s.acquire();
      const first = s.acquire();   // queued first
      const second = s.acquire();  // queued second
      expect(s.queueDepth).toBe(2);

      // Release once after 500ms: `first` is granted, `second` keeps waiting.
      await vi.advanceTimersByTimeAsync(500);
      s.release();
      expect(await first).toBe(true);
      expect(s.queueDepth).toBe(1);

      // `second` was queued at t=0 with a 1000ms budget → times out at t=1000.
      await vi.advanceTimersByTimeAsync(500);
      expect(await second).toBe(false);
      expect(s.queueDepth).toBe(0);
    });
  });
});
