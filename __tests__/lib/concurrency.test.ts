import { describe, it, expect, beforeEach } from "vitest";
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
});
