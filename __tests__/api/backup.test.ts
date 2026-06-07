import { describe, it, expect, beforeEach, vi } from "vitest";

// Mutable management-key row returned by the mocked DB.
let mgmtRow: { value: string } | undefined;

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    prepare: () => ({ get: () => mgmtRow }),
  }),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: () => true,
    readFileSync: () => Buffer.from("SQLite format 3\0fake-db-bytes"),
  },
  existsSync: () => true,
  readFileSync: () => Buffer.from("SQLite format 3\0fake-db-bytes"),
}));

import { GET } from "@/app/api/admin/backup/route";

function req(auth?: string): Request {
  const headers = new Headers();
  if (auth) headers.set("Authorization", auth);
  return new Request("http://localhost/api/admin/backup", { headers });
}

describe("GET /api/admin/backup", () => {
  beforeEach(() => {
    mgmtRow = { value: "sk-mw-realkey" };
  });

  it("401 when no management key is configured", async () => {
    mgmtRow = undefined;
    const res = await GET(req("Bearer sk-mw-realkey"));
    expect(res.status).toBe(401);
  });

  it("401 with no Authorization header", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid or missing management key" });
  });

  it("401 with a wrong bearer token (constant-time compare)", async () => {
    const res = await GET(req("Bearer sk-mw-wrong"));
    expect(res.status).toBe(401);
  });

  it("200 octet-stream download with the correct management key", async () => {
    const res = await GET(req("Bearer sk-mw-realkey"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(Number(res.headers.get("Content-Length"))).toBeGreaterThan(0);
  });
});
