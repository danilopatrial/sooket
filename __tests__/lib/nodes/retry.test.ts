import { describe, it, expect, afterEach, vi } from "vitest";
import { execute } from "@/lib/nodes/retry";
import { makeNode, makeCtx } from "./helpers";
import type { WorkflowNode } from "@/lib/workflow-types";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Runs the retry node with an upstream that always throws, capturing every
 * backoff delay. setTimeout is stubbed to fire synchronously so the test does
 * not actually wait, and to record the requested delay in ms.
 */
async function runAndCaptureDelays(data: Record<string, unknown>): Promise<number[]> {
  const delays: number[] = [];
  vi.stubGlobal("setTimeout", ((cb: () => void, ms?: number) => {
    delays.push(ms ?? 0);
    cb();
    return 0;
  }) as unknown as typeof setTimeout);

  const upstream: WorkflowNode = { id: "upstream", type: "http-request", data: {} };
  const ctx = makeCtx({
    inputFor: (h) => (h === "input" ? { node: upstream, sourceHandle: null, connectionType: "main" as const } : null),
    evalInput: async () => { throw new Error("always fails"); },
  });

  await execute.execute(makeNode("retry", data), "failed", ctx);
  return delays;
}

describe("retry executor — max delay cap", () => {
  it("caps exponential backoff at the configured maxDelayMs", async () => {
    const delays = await runAndCaptureDelays({
      maxAttempts: 10, backoff: "exponential", baseDelayMs: 1000, maxDelayMs: 5000,
    });
    // 9 delays for attempts 2..10; uncapped they'd be 1000,2000,4000,8000,...256000.
    expect(delays).toHaveLength(9);
    expect(Math.max(...delays)).toBe(5000);
    expect(delays.every((d) => d <= 5000)).toBe(true);
    expect(delays.slice(0, 3)).toEqual([1000, 2000, 4000]); // below the cap, untouched
  });

  it("falls back to a 30 s cap when maxDelayMs is missing", async () => {
    const delays = await runAndCaptureDelays({
      maxAttempts: 10, backoff: "exponential", baseDelayMs: 1000,
    });
    expect(Math.max(...delays)).toBe(30000);
  });

  it("falls back to 30 s for a zero/negative maxDelayMs", async () => {
    const zero = await runAndCaptureDelays({
      maxAttempts: 10, backoff: "exponential", baseDelayMs: 1000, maxDelayMs: 0,
    });
    expect(Math.max(...zero)).toBe(30000);
    const negative = await runAndCaptureDelays({
      maxAttempts: 10, backoff: "exponential", baseDelayMs: 1000, maxDelayMs: -1,
    });
    expect(Math.max(...negative)).toBe(30000);
  });

  it("caps linear backoff too", async () => {
    const delays = await runAndCaptureDelays({
      maxAttempts: 6, backoff: "linear", baseDelayMs: 10000, maxDelayMs: 25000,
    });
    // linear: calcDelay(attempt-1) = base*(attempt-1) → 10000,20000,30000,40000,50000
    expect(Math.max(...delays)).toBe(25000);
  });

  it("does not delay before the first attempt", async () => {
    const delays = await runAndCaptureDelays({
      maxAttempts: 1, backoff: "exponential", baseDelayMs: 1000, maxDelayMs: 5000,
    });
    expect(delays).toHaveLength(0);
  });
});
