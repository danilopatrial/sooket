import { describe, it, expect, vi } from "vitest";

import { execute as accessListExec } from "@/lib/nodes/access-list";
import { execute as listManagerExec } from "@/lib/nodes/list-manager";
import { execute as cacheExec }       from "@/lib/nodes/cache";
import { execute as rateLimiterExec } from "@/lib/nodes/rate-limiter";
import { makeNode, makeCtx, wireInput } from "./helpers";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";

// ─── Access List ──────────────────────────────────────────────────────────────

describe("access-list executor", () => {
  it("throws when input is not connected", async () => {
    await expect(accessListExec.execute(makeNode("access-list", { mode: "whitelist" }), "pass", makeCtx())).rejects.toThrow("no input connected");
  });

  it("passes on 'pass' handle when value is in whitelist", async () => {
    const ctx = makeCtx({ ...wireInput("input", "allowed"), getAccessList: () => ["allowed"] });
    const r = await accessListExec.execute(makeNode("access-list", { mode: "whitelist" }), "pass", ctx);
    expect(r.value).toBe("allowed");
    expect(r.active).not.toBe(false);
  });

  it("returns inactive on 'pass' handle when value is NOT in whitelist", async () => {
    const ctx = makeCtx({ ...wireInput("input", "blocked"), getAccessList: () => ["allowed"] });
    const r = await accessListExec.execute(makeNode("access-list", { mode: "whitelist" }), "pass", ctx);
    expect(r.active).toBe(false);
  });

  it("blocks on 'block' handle when value IS in blacklist", async () => {
    const ctx = makeCtx({ ...wireInput("input", "banned"), getAccessList: () => ["banned"] });
    const r = await accessListExec.execute(makeNode("access-list", { mode: "blacklist" }), "block", ctx);
    expect(r.value).toBe("banned");
    expect(r.active).not.toBe(false);
  });

  it("passes on 'pass' handle when value is NOT in blacklist", async () => {
    const ctx = makeCtx({ ...wireInput("input", "clean"), getAccessList: () => ["banned"] });
    const r = await accessListExec.execute(makeNode("access-list", { mode: "blacklist" }), "pass", ctx);
    expect(r.value).toBe("clean");
    expect(r.active).not.toBe(false);
  });

  it("returns boolean match result on 'match' handle", async () => {
    const ctx = makeCtx({ ...wireInput("input", "test"), getAccessList: () => ["test"] });
    const r = await accessListExec.execute(makeNode("access-list", { mode: "whitelist" }), "match", ctx);
    expect(r.value).toBe(true);
  });

  it("does case-insensitive matching", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello"), getAccessList: () => ["HELLO"] });
    const r = await accessListExec.execute(makeNode("access-list", { mode: "whitelist" }), "pass", ctx);
    expect(r.active).not.toBe(false);
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
      getAccessList: () => [],
    });
    const r = await accessListExec.execute(makeNode("access-list", { mode: "whitelist" }), "pass", ctx);
    expect(r.active).toBe(false);
  });
});

// ─── List Manager ─────────────────────────────────────────────────────────────

describe("list-manager executor", () => {
  it("throws when value input is not connected", async () => {
    await expect(listManagerExec.execute(makeNode("list-manager", { action: "add" }), "value", makeCtx())).rejects.toThrow("no value input connected");
  });

  it("adds a value and returns success=true on 'success' handle", async () => {
    const addSpy = vi.fn();
    const ctx = makeCtx({ ...wireInput("value", "192.168.1.1"), addAccessListEntry: addSpy });
    const r = await listManagerExec.execute(makeNode("list-manager", { action: "add" }), "success", ctx);
    expect(r.value).toBe(true);
    expect(addSpy).toHaveBeenCalled();
  });

  it("removes a value and returns success=true on 'success' handle", async () => {
    const removeSpy = vi.fn();
    const ctx = makeCtx({ ...wireInput("value", "192.168.1.1"), removeAccessListEntry: removeSpy });
    const r = await listManagerExec.execute(makeNode("list-manager", { action: "remove" }), "success", ctx);
    expect(r.value).toBe(true);
  });

  it("returns the value on default 'value' handle", async () => {
    const ctx = makeCtx({ ...wireInput("value", "some-value") });
    const r = await listManagerExec.execute(makeNode("list-manager", { action: "add" }), "value", ctx);
    expect(r.value).toBe("some-value");
  });

  it("returns success=false and error message when value is empty", async () => {
    const ctx = makeCtx({ ...wireInput("value", "") });
    const r = await listManagerExec.execute(makeNode("list-manager", { action: "add" }), "success", ctx);
    expect(r.value).toBe(false);
    const errCtx = makeCtx({ ...wireInput("value", "") });
    const errR = await listManagerExec.execute(makeNode("list-manager", { action: "add" }), "error", errCtx);
    expect(errR.value).toBe("value is empty");
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "value" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await listManagerExec.execute(makeNode("list-manager", { action: "add" }), "value", ctx);
    expect(r.active).toBe(false);
  });
});

// ─── Cache ────────────────────────────────────────────────────────────────────

describe("cache executor", () => {
  it("throws when key input is not connected", async () => {
    const fakeNode: WorkflowNode = { id: "val", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "value" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: "v", inputTokens: 0, outputTokens: 0 }),
    });
    await expect(cacheExec.execute(makeNode("cache", { ttl: 60 }), "output", ctx)).rejects.toThrow("no key input connected");
  });

  it("throws when value input is not connected", async () => {
    const fakeNode: WorkflowNode = { id: "key", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "key" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: "k", inputTokens: 0, outputTokens: 0 }),
    });
    await expect(cacheExec.execute(makeNode("cache", { ttl: 60 }), "output", ctx)).rejects.toThrow("no value input connected");
  });

  it("returns cached value on cache hit", async () => {
    const keyNode: WorkflowNode = { id: "key-node", type: "text", data: {} };
    const valNode: WorkflowNode = { id: "val-node", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => {
        if (h === "key")   return { node: keyNode, sourceHandle: null };
        if (h === "value") return { node: valNode, sourceHandle: null };
        return null;
      },
      evalInput: async (src) => {
        if (src.node.id === "key-node") return { value: "my-key", inputTokens: 0, outputTokens: 0 };
        return { value: "fresh-value", inputTokens: 0, outputTokens: 0 };
      },
      getCacheEntry: () => '"cached-value"',
    });
    const r = await cacheExec.execute(makeNode("cache", { ttl: 3600 }), "output", ctx);
    expect(r.value).toBe("cached-value");
  });

  it("returns 'hit=true' on 'hit' handle when there is a cache hit", async () => {
    const keyNode: WorkflowNode = { id: "key-node", type: "text", data: {} };
    const valNode: WorkflowNode = { id: "val-node", type: "text", data: {} };
    const cache = new Map<string, EvalResult>();
    const ctx = makeCtx({
      nodeId: "node-1",
      cache,
      inputFor: (h) => {
        if (h === "key")   return { node: keyNode, sourceHandle: null };
        if (h === "value") return { node: valNode, sourceHandle: null };
        return null;
      },
      evalInput: async () => ({ value: "k", inputTokens: 0, outputTokens: 0 }),
      getCacheEntry: () => '"x"',
    });
    const r = await cacheExec.execute(makeNode("cache", { ttl: 3600 }), "hit", ctx);
    expect(r.value).toBe(true);
  });

  it("stores value on cache miss and returns it", async () => {
    const setSpy = vi.fn();
    const keyNode: WorkflowNode = { id: "key-node", type: "text", data: {} };
    const valNode: WorkflowNode = { id: "val-node", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => {
        if (h === "key")   return { node: keyNode, sourceHandle: null };
        if (h === "value") return { node: valNode, sourceHandle: null };
        return null;
      },
      evalInput: async (src) => {
        if (src.node.id === "key-node") return { value: "k", inputTokens: 0, outputTokens: 0 };
        return { value: "fresh", inputTokens: 0, outputTokens: 0 };
      },
      getCacheEntry: () => null,
      setCacheEntry: setSpy,
    });
    const r = await cacheExec.execute(makeNode("cache", { ttl: 3600 }), "output", ctx);
    expect(r.value).toBe("fresh");
    expect(setSpy).toHaveBeenCalled();
  });
});

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

describe("rate-limiter executor", () => {
  it("throws when input is not connected", async () => {
    await expect(rateLimiterExec.execute(makeNode("rate-limiter", {}), "output", makeCtx())).rejects.toThrow("no input connected");
  });

  it("passes through when under the limit", async () => {
    // count = 1, limit = 100 → under limit
    const ctx = makeCtx({
      ...wireInput("input", "data"),
      incrementRateLimitCounter: () => 1,
    });
    const r = await rateLimiterExec.execute(makeNode("rate-limiter", {
      keySource: "ip", windowSeconds: 60, limit: 100, action: "block",
    }), "output", ctx);
    expect(r.value).toBe("data");
    expect(r.active).not.toBe(false);
  });

  it("returns inactive on 'output' when over limit with action=block", async () => {
    const ctx = makeCtx({
      ...wireInput("input", "data"),
      incrementRateLimitCounter: () => 101,
    });
    const r = await rateLimiterExec.execute(makeNode("rate-limiter", {
      keySource: "ip", windowSeconds: 60, limit: 100, action: "block",
    }), "output", ctx);
    expect(r.active).toBe(false);
  });

  it("returns rate-limit message on 'blocked' handle when over limit", async () => {
    const ctx = makeCtx({
      ...wireInput("input", "data"),
      incrementRateLimitCounter: () => 101,
    });
    const r = await rateLimiterExec.execute(makeNode("rate-limiter", {
      keySource: "ip", windowSeconds: 60, limit: 100, action: "block",
    }), "blocked", ctx);
    expect(typeof r.value).toBe("string");
    expect(r.value as string).toContain("Rate limit exceeded");
  });

  it("returns inactive on 'blocked' handle when under limit", async () => {
    const ctx = makeCtx({
      ...wireInput("input", "data"),
      incrementRateLimitCounter: () => 5,
    });
    const r = await rateLimiterExec.execute(makeNode("rate-limiter", {
      keySource: "ip", windowSeconds: 60, limit: 100, action: "block",
    }), "blocked", ctx);
    expect(r.active).toBe(false);
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await rateLimiterExec.execute(makeNode("rate-limiter", {}), "output", ctx);
    expect(r.active).toBe(false);
  });
});
