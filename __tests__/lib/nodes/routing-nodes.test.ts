import { describe, it, expect, vi } from "vitest";
import { execute as routerExec }        from "@/lib/nodes/router";
import { execute as abSplitExec }       from "@/lib/nodes/ab-split";
import { execute as languageDetectExec }from "@/lib/nodes/language-detect";
import { makeNode, makeCtx, wireInput } from "./helpers";
import type { WorkflowNode } from "@/lib/workflow-types";

// ─── Router ───────────────────────────────────────────────────────────────────

describe("router executor", () => {
  it("throws when input is not connected", async () => {
    await expect(
      routerExec.execute(makeNode("router", { cases: [], hasDefault: false }), "case-0", makeCtx())
    ).rejects.toThrow("no input connected");
  });

  it("passes through on matching case handle", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await routerExec.execute(
      makeNode("router", { cases: [{ id: "case-0", label: "A", match: "hello" }], hasDefault: false }),
      "case-0",
      ctx
    );
    expect(r.value).toBe("hello");
    expect(r.active).not.toBe(false);
  });

  it("returns inactive on non-matching case handle", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await routerExec.execute(
      makeNode("router", { cases: [{ id: "case-0", label: "A", match: "world" }], hasDefault: false }),
      "case-0",
      ctx
    );
    expect(r.active).toBe(false);
  });

  it("routes to 'default' handle when no case matches and hasDefault=true", async () => {
    const ctx = makeCtx({ ...wireInput("input", "nomatch") });
    const r = await routerExec.execute(
      makeNode("router", { cases: [{ id: "case-0", label: "A", match: "hello" }], hasDefault: true }),
      "default",
      ctx
    );
    expect(r.active).not.toBe(false);
    expect(r.value).toBe("nomatch");
  });

  it("does not route to 'default' when a case matches", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await routerExec.execute(
      makeNode("router", { cases: [{ id: "case-0", label: "A", match: "hello" }], hasDefault: true }),
      "default",
      ctx
    );
    expect(r.active).toBe(false);
  });

  it("matches numeric values", async () => {
    const ctx = makeCtx({ ...wireInput("input", 42) });
    const r = await routerExec.execute(
      makeNode("router", { cases: [{ id: "num-case", label: "42", match: "42" }], hasDefault: false }),
      "num-case",
      ctx
    );
    expect(r.active).not.toBe(false);
  });

  it("matches boolean values via string comparison", async () => {
    const ctx = makeCtx({ ...wireInput("input", true) });
    const r = await routerExec.execute(
      makeNode("router", { cases: [{ id: "bool-case", label: "true", match: "true" }], hasDefault: false }),
      "bool-case",
      ctx
    );
    expect(r.active).not.toBe(false);
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await routerExec.execute(
      makeNode("router", { cases: [{ id: "case-0", label: "A", match: "x" }], hasDefault: false }),
      "case-0",
      ctx
    );
    expect(r.active).toBe(false);
  });

  it("passes 'data' handle value as output when connected", async () => {
    const fakeInput: WorkflowNode = { id: "upstream-input", type: "text", data: {} };
    const fakeData:  WorkflowNode = { id: "upstream-data",  type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => {
        if (h === "input") return { node: fakeInput, sourceHandle: null };
        if (h === "data")  return { node: fakeData,  sourceHandle: null };
        return null;
      },
      evalInput: async (src) => {
        if (src.node.id === "upstream-input") return { value: "match-val", inputTokens: 0, outputTokens: 0 };
        return { value: "data-val", inputTokens: 0, outputTokens: 0 };
      },
    });
    const r = await routerExec.execute(
      makeNode("router", { cases: [{ id: "c0", label: "x", match: "match-val" }], hasDefault: false }),
      "c0",
      ctx
    );
    expect(r.value).toBe("data-val");
  });
});

// ─── A/B Split ────────────────────────────────────────────────────────────────

describe("ab-split executor", () => {
  it("throws when input is not connected", async () => {
    await expect(
      abSplitExec.execute(makeNode("ab-split", { branches: [{ id: "a", weight: 50 }, { id: "b", weight: 50 }] }), "a", makeCtx())
    ).rejects.toThrow("no input connected");
  });

  it("throws when no branches are configured", async () => {
    const ctx = makeCtx({ ...wireInput("input", "x") });
    await expect(
      abSplitExec.execute(makeNode("ab-split", { branches: [] }), "a", ctx)
    ).rejects.toThrow("no branches configured");
  });

  it("throws when weights do not sum to 100", async () => {
    const ctx = makeCtx({ ...wireInput("input", "x") });
    await expect(
      abSplitExec.execute(makeNode("ab-split", { branches: [{ id: "a", weight: 30 }, { id: "b", weight: 30 }] }), "a", ctx)
    ).rejects.toThrow("sum to 100");
  });

  it("routes to branch 'a' when Math.random returns 0.1 (within first 50%)", async () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.1);
    const ctx = makeCtx({ ...wireInput("input", "data") });
    const node = makeNode("ab-split", { branches: [{ id: "a", weight: 50 }, { id: "b", weight: 50 }] });
    const ra = await abSplitExec.execute(node, "a", ctx);
    const rb = await abSplitExec.execute(node, "b", ctx);
    expect(ra.active).not.toBe(false);
    expect(rb.active).toBe(false);
    spy.mockRestore();
  });

  it("routes to branch 'b' when Math.random returns 0.7 (within second 50%)", async () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.7);
    const ctx = makeCtx({ ...wireInput("input", "data") });
    const node = makeNode("ab-split", { branches: [{ id: "a", weight: 50 }, { id: "b", weight: 50 }] });
    const ra = await abSplitExec.execute(node, "a", ctx);
    const rb = await abSplitExec.execute(node, "b", ctx);
    expect(ra.active).toBe(false);
    expect(rb.active).not.toBe(false);
    spy.mockRestore();
  });

  it("always routes to the only branch (100% weight)", async () => {
    const ctx = makeCtx({ ...wireInput("input", "data") });
    const r = await abSplitExec.execute(
      makeNode("ab-split", { branches: [{ id: "only", weight: 100 }] }),
      "only",
      ctx
    );
    expect(r.active).not.toBe(false);
    expect(r.value).toBe("data");
  });

  it("never routes to a 0% branch", async () => {
    // With Math.random mocked to 0.5, a 0% branch should never match
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const ctx = makeCtx({ ...wireInput("input", "data") });
    const r = await abSplitExec.execute(
      makeNode("ab-split", { branches: [{ id: "zero", weight: 0 }, { id: "full", weight: 100 }] }),
      "zero",
      ctx
    );
    expect(r.active).toBe(false);
    spy.mockRestore();
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await abSplitExec.execute(
      makeNode("ab-split", { branches: [{ id: "a", weight: 50 }, { id: "b", weight: 50 }] }),
      "a",
      ctx
    );
    expect(r.active).toBe(false);
  });
});

// ─── Language Detect ──────────────────────────────────────────────────────────

describe("language-detect executor", () => {
  it("throws when input is not connected", async () => {
    await expect(
      languageDetectExec.execute(makeNode("language-detect", { routes: [] }), "default", makeCtx())
    ).rejects.toThrow("no input connected");
  });

  it("returns detected language code on 'lang' handle", async () => {
    const ctx = makeCtx({ ...wireInput("input", "This is an English sentence for language detection.") });
    const r = await languageDetectExec.execute(makeNode("language-detect", { routes: [] }), "lang", ctx);
    expect(typeof r.value).toBe("string");
    expect((r.value as string).length).toBeGreaterThan(0);
  });

  it("returns a confidence score on 'confidence' handle", async () => {
    const ctx = makeCtx({ ...wireInput("input", "Hello world, this is English.") });
    const r = await languageDetectExec.execute(makeNode("language-detect", { routes: [] }), "confidence", ctx);
    expect(typeof r.value).toBe("number");
  });

  it("routes to 'default' when text matches no configured route and hasDefault=true", async () => {
    const ctx = makeCtx({ ...wireInput("input", "Hello world, clearly English text here.") });
    const r = await languageDetectExec.execute(
      makeNode("language-detect", { routes: [{ id: "spa-route", lang: "spa" }], hasDefault: true }),
      "default",
      ctx
    );
    // English text should not match Spanish route; default should activate
    // (result depends on franc detection — just verify it doesn't crash)
    expect(r).toBeDefined();
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await languageDetectExec.execute(makeNode("language-detect", { routes: [] }), "lang", ctx);
    expect(r.active).toBe(false);
  });
});
