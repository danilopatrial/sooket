import { describe, it, expect, beforeEach, vi } from "vitest";

// Set memory backend before importing so the singleton is constructed with it
process.env.BINARY_DATA_BACKEND = "memory";

import { BinaryDataService } from "@/lib/binary-data";
import type { NodeContext } from "@/lib/nodes/types";

// ─── BinaryDataService (memory backend) ─────────────────────────────────────

describe("BinaryDataService (memory backend)", () => {
  let svc: BinaryDataService;

  beforeEach(() => {
    process.env.BINARY_DATA_BACKEND = "memory";
    svc = new BinaryDataService();
  });

  it("write() returns IBinaryRef with correct mimeType, fileName, size", async () => {
    const buf = Buffer.from("hello world");
    const ref = await svc.write(buf, "text/plain", "hello.txt", "exec-1");

    expect(ref.mimeType).toBe("text/plain");
    expect(ref.fileName).toBe("hello.txt");
    expect(ref.size).toBe(buf.byteLength);
    expect(ref.backend).toBe("memory");
    expect(typeof ref.id).toBe("string");
    expect(ref.id.length).toBeGreaterThan(0);
  });

  it("write() returns a plain serializable object (no Buffer fields)", async () => {
    const buf = Buffer.from([1, 2, 3]);
    const ref = await svc.write(buf, "application/octet-stream", "file.bin", "exec-1");
    const json = JSON.stringify(ref);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toMatchObject({ mimeType: "application/octet-stream" });
  });

  it("read(id) returns the original buffer", async () => {
    const buf = Buffer.from("binary content");
    const ref = await svc.write(buf, "image/png", "img.png", "exec-1");
    const result = await svc.read(ref.id);
    expect(result).toEqual(buf);
  });

  it("getRef(id) returns the ref", async () => {
    const buf = Buffer.from("abc");
    const ref = await svc.write(buf, "audio/mpeg", "sound.mp3", "exec-1");
    const fetched = svc.getRef(ref.id);
    expect(fetched).toEqual(ref);
  });

  it("getRef() returns null for unknown id", () => {
    expect(svc.getRef("nonexistent-uuid")).toBeNull();
  });

  it("read() throws for unknown id", async () => {
    await expect(svc.read("nonexistent-uuid")).rejects.toThrow(
      "binary data not found or expired"
    );
  });

  it("cleanup() removes expired entries", async () => {
    const buf = Buffer.from("data");
    const ref = await svc.write(buf, "image/jpeg", "img.jpg", "exec-1");

    // Backdating: reach into the private map and expire the entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (svc as unknown as any).memStore as Map<
      string,
      { buf: Buffer; ref: object; expiresAt: number }
    >;
    const entry = store.get(ref.id)!;
    store.set(ref.id, { ...entry, expiresAt: Date.now() - 1 });

    svc.cleanup();

    await expect(svc.read(ref.id)).rejects.toThrow(
      "binary data not found or expired"
    );
  });

  it("cleanup() leaves non-expired entries intact", async () => {
    const buf = Buffer.from("keep me");
    const ref = await svc.write(buf, "text/plain", "keep.txt", "exec-1");
    svc.cleanup();
    const result = await svc.read(ref.id);
    expect(result).toEqual(buf);
  });

  it("write() with zero-length buffer works", async () => {
    const buf = Buffer.alloc(0);
    const ref = await svc.write(buf, "application/octet-stream", "empty.bin", "exec-1");
    expect(ref.size).toBe(0);
    const result = await svc.read(ref.id);
    expect(result.byteLength).toBe(0);
  });

  it("multiple concurrent writes return distinct ids", async () => {
    const bufs = Array.from({ length: 5 }, (_, i) => Buffer.from(`data-${i}`));
    const refs = await Promise.all(
      bufs.map((b, i) => svc.write(b, "text/plain", `file-${i}.txt`, "exec-1"))
    );
    const ids = refs.map((r) => r.id);
    expect(new Set(ids).size).toBe(5);
  });
});

// ─── HTTP Request node — binary path ────────────────────────────────────────

describe("HTTP Request node — binary response", () => {
  it("stores binary as IBinaryRef when ctx.binaryData is present", async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: {
          get: (h: string) => {
            if (h === "content-type") return "image/png";
            if (h === "content-disposition") return null;
            return null;
          },
        },
        arrayBuffer: async () => pngBytes.buffer,
      })
    );

    const binarySvc = new BinaryDataService();
    const writeSpy = vi.spyOn(binarySvc, "write");

    const { execute } = await import("@/lib/nodes/http-request");
    const node = {
      id: "node-1",
      type: "httpRequest",
      data: {
        url: "https://example.com/image.png",
        method: "GET",
        headers: [],
        timeout: 5000,
      },
    };

    const cache = new Map();
    const ctx = {
      nodeId: "node-1",
      workflow: { id: 1, nodes: [], edges: [], is_active: 1 },
      body: {},
      cache,
      reqHeaders: new Headers(),
      vars: new Map(),
      reqCtx: { method: "GET", url: "", rawBody: "", ip: "" },
      encryptionSecret: "secret",
      inputFor: () => null,
      inputForError: () => null,
      evalInput: async () => ({ value: undefined, inputTokens: 0, outputTokens: 0 }),
      getProviderKey: async () => null,
      getAccessList: () => [],
      addAccessListEntry: () => {},
      removeAccessListEntry: () => {},
      getCacheEntry: () => null,
      setCacheEntry: () => {},
      evictExpiredCacheEntries: () => {},
      incrementRateLimitCounter: () => 0,
      evictExpiredRateLimitCounters: () => {},
      getSemanticCacheEntries: () => [],
      insertSemanticCacheEntry: () => {},
      evictExpiredSemanticCacheEntries: () => {},
      getStaticData: () => undefined,
      setStaticData: () => {},
      executionId: "exec-test",
      binaryData: binarySvc,
    } as unknown as NodeContext;

    const result = await execute.execute(node, null, ctx);

    expect(writeSpy).toHaveBeenCalledOnce();
    const ref = result.value as { id: string; mimeType: string; backend: string };
    expect(ref).toMatchObject({
      mimeType: "image/png",
      backend: "memory",
    });
    expect(typeof ref.id).toBe("string");

    vi.unstubAllGlobals();
  });

  it("falls back to base64 object when ctx.binaryData is absent", async () => {
    const pdfBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: {
          get: (h: string) => {
            if (h === "content-type") return "application/pdf";
            return null;
          },
        },
        arrayBuffer: async () => pdfBytes.buffer,
      })
    );

    const { execute } = await import("@/lib/nodes/http-request");
    const node = {
      id: "node-2",
      type: "httpRequest",
      data: {
        url: "https://example.com/doc.pdf",
        method: "GET",
        headers: [],
        timeout: 5000,
      },
    };

    const cache = new Map();
    const ctx = {
      nodeId: "node-2",
      workflow: { id: 1, nodes: [], edges: [], is_active: 1 },
      body: {},
      cache,
      reqHeaders: new Headers(),
      vars: new Map(),
      reqCtx: { method: "GET", url: "", rawBody: "", ip: "" },
      encryptionSecret: "secret",
      inputFor: () => null,
      inputForError: () => null,
      evalInput: async () => ({ value: undefined, inputTokens: 0, outputTokens: 0 }),
      getProviderKey: async () => null,
      getAccessList: () => [],
      addAccessListEntry: () => {},
      removeAccessListEntry: () => {},
      getCacheEntry: () => null,
      setCacheEntry: () => {},
      evictExpiredCacheEntries: () => {},
      incrementRateLimitCounter: () => 0,
      evictExpiredRateLimitCounters: () => {},
      getSemanticCacheEntries: () => [],
      insertSemanticCacheEntry: () => {},
      evictExpiredSemanticCacheEntries: () => {},
      getStaticData: () => undefined,
      setStaticData: () => {},
      // No binaryData / executionId — tests the fallback path
    } as unknown as NodeContext;

    const result = await execute.execute(node, null, ctx);
    const val = result.value as { _binary: boolean; base64: string; mimeType: string };
    expect(val._binary).toBe(true);
    expect(val.mimeType).toBe("application/pdf");
    expect(typeof val.base64).toBe("string");

    vi.unstubAllGlobals();
  });

  it("text/plain response is returned as string (unchanged path)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: { get: (h: string) => (h === "content-type" ? "text/plain" : null) },
        text: async () => "hello text",
      })
    );

    const { execute } = await import("@/lib/nodes/http-request");
    const node = {
      id: "node-3",
      type: "httpRequest",
      data: { url: "https://example.com/hello", method: "GET", headers: [], timeout: 5000 },
    };

    const ctx = {
      nodeId: "node-3",
      workflow: { id: 1, nodes: [], edges: [], is_active: 1 },
      body: {},
      cache: new Map(),
      reqHeaders: new Headers(),
      vars: new Map(),
      reqCtx: { method: "GET", url: "", rawBody: "", ip: "" },
      encryptionSecret: "secret",
      inputFor: () => null,
      inputForError: () => null,
      evalInput: async () => ({ value: undefined, inputTokens: 0, outputTokens: 0 }),
      getProviderKey: async () => null,
      getAccessList: () => [],
      addAccessListEntry: () => {},
      removeAccessListEntry: () => {},
      getCacheEntry: () => null,
      setCacheEntry: () => {},
      evictExpiredCacheEntries: () => {},
      incrementRateLimitCounter: () => 0,
      evictExpiredRateLimitCounters: () => {},
      getSemanticCacheEntries: () => [],
      insertSemanticCacheEntry: () => {},
      evictExpiredSemanticCacheEntries: () => {},
      getStaticData: () => undefined,
      setStaticData: () => {},
    } as unknown as NodeContext;

    const result = await execute.execute(node, null, ctx);
    expect(result.value).toBe("hello text");

    vi.unstubAllGlobals();
  });

  it("application/json response is parsed as object (unchanged path)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: { get: (h: string) => (h === "content-type" ? "application/json" : null) },
        text: async () => '{"ok":true}',
      })
    );

    const { execute } = await import("@/lib/nodes/http-request");
    const node = {
      id: "node-4",
      type: "httpRequest",
      data: { url: "https://example.com/api", method: "GET", headers: [], timeout: 5000 },
    };

    const ctx = {
      nodeId: "node-4",
      workflow: { id: 1, nodes: [], edges: [], is_active: 1 },
      body: {},
      cache: new Map(),
      reqHeaders: new Headers(),
      vars: new Map(),
      reqCtx: { method: "GET", url: "", rawBody: "", ip: "" },
      encryptionSecret: "secret",
      inputFor: () => null,
      inputForError: () => null,
      evalInput: async () => ({ value: undefined, inputTokens: 0, outputTokens: 0 }),
      getProviderKey: async () => null,
      getAccessList: () => [],
      addAccessListEntry: () => {},
      removeAccessListEntry: () => {},
      getCacheEntry: () => null,
      setCacheEntry: () => {},
      evictExpiredCacheEntries: () => {},
      incrementRateLimitCounter: () => 0,
      evictExpiredRateLimitCounters: () => {},
      getSemanticCacheEntries: () => [],
      insertSemanticCacheEntry: () => {},
      evictExpiredSemanticCacheEntries: () => {},
      getStaticData: () => undefined,
      setStaticData: () => {},
    } as unknown as NodeContext;

    const result = await execute.execute(node, null, ctx);
    expect(result.value).toEqual({ ok: true });

    vi.unstubAllGlobals();
  });
});
