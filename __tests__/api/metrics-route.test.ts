/**
 * GET /api/metrics route wiring: returns 200 with the Prometheus content type,
 * no-store caching, and the rendered exposition body. Metrics logic itself is
 * covered by __tests__/lib/metrics.test.ts; here the heavy deps are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ getDb: vi.fn(() => ({})) }));
vi.mock("@/lib/concurrency", () => ({ executionSemaphore: {} }));
vi.mock("@/lib/metrics", () => ({
  renderMetrics: vi.fn(() => "sooket_up 1\n"),
  PROMETHEUS_CONTENT_TYPE: "text/plain; version=0.0.4; charset=utf-8",
}));

import { GET } from "@/app/api/metrics/route";
import { renderMetrics } from "@/lib/metrics";

describe("GET /api/metrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with the Prometheus content type and body", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; version=0.0.4; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.text()).toBe("sooket_up 1\n");
  });

  it("renders metrics from the DB and the execution semaphore", async () => {
    await GET();
    expect(vi.mocked(renderMetrics)).toHaveBeenCalledOnce();
  });
});
