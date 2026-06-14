import { describe, it, expect, vi, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";

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

// The route opens the DB via getDb() only in readiness mode; mock it so the
// real probe (lib/db/health) runs against a controllable handle.
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

import { GET } from "@/app/api/health/route";
import { getDb } from "@/lib/db";
import { version as pkgVersion } from "@/package.json";

const getDbMock = vi.mocked(getDb);

function readyReq(query = "?ready=1"): Request {
  return new Request(`http://localhost/api/health${query}`);
}

afterEach(() => {
  vi.useRealTimers();
  getDbMock.mockReset();
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

  it("liveness does not touch the DB (getDb never called)", async () => {
    await GET();
    await GET(new Request("http://localhost/api/health"));
    expect(getDbMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/health?ready=1 (readiness)", () => {
  it("returns 200 with checks.db = 'ok' when the DB is healthy", async () => {
    const db = new DatabaseSync(":memory:");
    getDbMock.mockReturnValue(db);

    const res = await GET(readyReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.checks).toEqual({ db: "ok" });
    db.close();
  });

  it("includes the liveness fields alongside checks", async () => {
    const db = new DatabaseSync(":memory:");
    getDbMock.mockReturnValue(db);

    const body = await (await GET(readyReq())).json();
    expect(Object.keys(body).sort()).toEqual([
      "checks",
      "status",
      "timestamp",
      "uptime",
      "version",
    ]);
    expect(body.version).toBe(pkgVersion);
    db.close();
  });

  it("returns 503 with checks.db = 'error' when the DB probe fails", async () => {
    const db = new DatabaseSync(":memory:");
    db.close(); // closed handle → probe throws internally → "error"
    getDbMock.mockReturnValue(db);

    const res = await GET(readyReq());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.checks).toEqual({ db: "error" });
  });

  it("returns 503 when the DB cannot even be opened (getDb throws)", async () => {
    getDbMock.mockImplementation(() => {
      throw new Error("cannot open database");
    });

    const res = await GET(readyReq());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.checks).toEqual({ db: "error" });
  });

  it("accepts ready=true and a bare ?ready as readiness", async () => {
    const db = new DatabaseSync(":memory:");
    getDbMock.mockReturnValue(db);

    for (const q of ["?ready=true", "?ready"]) {
      const res = await GET(readyReq(q));
      expect(res.status).toBe(200);
      expect((await res.json()).checks).toEqual({ db: "ok" });
    }
    db.close();
  });

  it("treats ready=0 and ready=false as liveness (no DB probe)", async () => {
    for (const q of ["?ready=0", "?ready=false"]) {
      const res = await GET(readyReq(q));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.checks).toBeUndefined();
    }
    expect(getDbMock).not.toHaveBeenCalled();
  });
});
