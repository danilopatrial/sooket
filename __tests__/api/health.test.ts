import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        json: async () => body,
      };
    },
  },
}));

import { GET } from "@/app/api/health/route";
import { version as pkgVersion } from "@/package.json";

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/health", () => {
  it("returns HTTP 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns status 'ok'", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("returns a non-negative integer uptime", async () => {
    const res = await GET();
    const body = await res.json();
    expect(typeof body.uptime).toBe("number");
    expect(Number.isInteger(body.uptime)).toBe(true);
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("returns a valid ISO 8601 timestamp", async () => {
    const before = Date.now();
    const res = await GET();
    const after = Date.now();
    const body = await res.json();
    const parsed = new Date(body.timestamp).getTime();
    expect(Number.isNaN(parsed)).toBe(false);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it("returns the package version", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.version).toBe(pkgVersion);
  });

  it("response body has exactly the expected fields", async () => {
    const res = await GET();
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp", "uptime", "version"]);
  });

  it("uptime is non-decreasing between consecutive calls", async () => {
    const first = await (await GET()).json();
    const second = await (await GET()).json();
    expect(second.uptime).toBeGreaterThanOrEqual(first.uptime);
  });

  it("uptime advances when time passes", async () => {
    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);
    const res = await GET();
    const body = await res.json();
    expect(body.uptime).toBeGreaterThanOrEqual(5);
  });

  it("timestamp updates on each call", async () => {
    const first = await (await GET()).json();
    await new Promise((r) => setTimeout(r, 10));
    const second = await (await GET()).json();
    expect(new Date(second.timestamp).getTime()).toBeGreaterThanOrEqual(
      new Date(first.timestamp).getTime()
    );
  });

  it("can be called many times without crashing", async () => {
    const calls = Array.from({ length: 20 }, () => GET());
    const results = await Promise.all(calls);
    for (const res of results) {
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
    }
  });
});
