import { describe, it, expect } from "vitest";
import { execute as ifExec }           from "@/lib/nodes/if";
import { execute as nullCheckExec }    from "@/lib/nodes/null-check";
import { execute as mergeExec }        from "@/lib/nodes/merge";
import { execute as sentimentExec }    from "@/lib/nodes/sentiment";
import { execute as tokenCounterExec } from "@/lib/nodes/token-counter";
import { makeNode, makeCtx, wireInput, wireInputs } from "./helpers";
import type { WorkflowNode } from "@/lib/workflow-types";

// ─── If ───────────────────────────────────────────────────────────────────────

describe("if executor", () => {
  it("throws when input is not connected", async () => {
    await expect(ifExec.execute(makeNode("if", { operator: "==" }), "true", makeCtx())).rejects.toThrow("no input connected");
  });

  it("routes to 'true' branch when == matches", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await ifExec.execute(makeNode("if", { operator: "==", compareTo: "hello" }), "true", ctx);
    expect(r.value).toBe("hello");
    expect(r.active).not.toBe(false);
  });

  it("routes to 'false' branch when == does not match", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await ifExec.execute(makeNode("if", { operator: "==", compareTo: "world" }), "false", ctx);
    expect(r.value).toBe("hello");
    expect(r.active).not.toBe(false);
  });

  it("returns inactive on 'true' branch when condition is false", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await ifExec.execute(makeNode("if", { operator: "==", compareTo: "world" }), "true", ctx);
    expect(r.active).toBe(false);
  });

  it("returns inactive on 'false' branch when condition is true", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await ifExec.execute(makeNode("if", { operator: "==", compareTo: "hello" }), "false", ctx);
    expect(r.active).toBe(false);
  });

  it("evaluates != operator", async () => {
    const ctx = makeCtx({ ...wireInput("input", "a") });
    const r = await ifExec.execute(makeNode("if", { operator: "!=", compareTo: "b" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("evaluates > operator with numbers", async () => {
    const ctx = makeCtx({ ...wireInput("input", 10) });
    const r = await ifExec.execute(makeNode("if", { operator: ">", compareTo: "5" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("evaluates < operator with numbers", async () => {
    const ctx = makeCtx({ ...wireInput("input", 3) });
    const r = await ifExec.execute(makeNode("if", { operator: "<", compareTo: "10" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("evaluates >= with equal values", async () => {
    const ctx = makeCtx({ ...wireInput("input", 5) });
    const r = await ifExec.execute(makeNode("if", { operator: ">=", compareTo: "5" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("evaluates <= with equal values", async () => {
    const ctx = makeCtx({ ...wireInput("input", 5) });
    const r = await ifExec.execute(makeNode("if", { operator: "<=", compareTo: "5" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("evaluates 'contains' operator", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello world") });
    const r = await ifExec.execute(makeNode("if", { operator: "contains", compareTo: "world" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("evaluates 'startsWith' operator", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello world") });
    const r = await ifExec.execute(makeNode("if", { operator: "startsWith", compareTo: "hello" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("evaluates 'endsWith' operator", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello world") });
    const r = await ifExec.execute(makeNode("if", { operator: "endsWith", compareTo: "world" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("isEmpty is true for null input", async () => {
    const ctx = makeCtx({ ...wireInput("input", null) });
    const r = await ifExec.execute(makeNode("if", { operator: "isEmpty" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("isEmpty is true for empty string", async () => {
    const ctx = makeCtx({ ...wireInput("input", "") });
    const r = await ifExec.execute(makeNode("if", { operator: "isEmpty" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("isEmpty is false for non-empty string", async () => {
    const ctx = makeCtx({ ...wireInput("input", "x") });
    const r = await ifExec.execute(makeNode("if", { operator: "isEmpty" }), "false", ctx);
    expect(r.active).not.toBe(false);
  });

  it("isTruthy is true for truthy value", async () => {
    const ctx = makeCtx({ ...wireInput("input", "yes") });
    const r = await ifExec.execute(makeNode("if", { operator: "isTruthy" }), "true", ctx);
    expect(r.active).not.toBe(false);
  });

  it("isTruthy is false for falsy value", async () => {
    const ctx = makeCtx({ ...wireInput("input", 0) });
    const r = await ifExec.execute(makeNode("if", { operator: "isTruthy" }), "false", ctx);
    expect(r.active).not.toBe(false);
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await ifExec.execute(makeNode("if", { operator: "==" }), "true", ctx);
    expect(r.active).toBe(false);
  });

  it("uses 'data' handle value as output when connected", async () => {
    const fakeInput: WorkflowNode = { id: "upstream-input", type: "text", data: {} };
    const fakeData:  WorkflowNode = { id: "upstream-data",  type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => {
        if (h === "input") return { node: fakeInput, sourceHandle: null };
        if (h === "data")  return { node: fakeData,  sourceHandle: null };
        return null;
      },
      evalInput: async (src) => {
        if (src.node.id === "upstream-input") return { value: "match", inputTokens: 0, outputTokens: 0 };
        return { value: "data-value", inputTokens: 0, outputTokens: 0 };
      },
    });
    const r = await ifExec.execute(makeNode("if", { operator: "==", compareTo: "match" }), "true", ctx);
    expect(r.value).toBe("data-value");
  });
});

// ─── Null Check ───────────────────────────────────────────────────────────────

describe("null-check executor", () => {
  it("passes through non-null input value", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await nullCheckExec.execute(makeNode("null-check", { fallback: "default" }), null, ctx);
    expect(r.value).toBe("hello");
  });

  it("returns static fallback when input is null", async () => {
    const ctx = makeCtx({ ...wireInput("input", null) });
    const r = await nullCheckExec.execute(makeNode("null-check", { fallback: "fallback-value" }), null, ctx);
    expect(r.value).toBe("fallback-value");
  });

  it("returns static fallback when input is undefined", async () => {
    const ctx = makeCtx({ ...wireInput("input", undefined) });
    const r = await nullCheckExec.execute(makeNode("null-check", { fallback: "safe" }), null, ctx);
    expect(r.value).toBe("safe");
  });

  it("returns empty string fallback when fallback is not configured", async () => {
    const ctx = makeCtx({ ...wireInput("input", null) });
    const r = await nullCheckExec.execute(makeNode("null-check", {}), null, ctx);
    expect(r.value).toBe("");
  });

  it("passes through 0 as a valid non-null value", async () => {
    const ctx = makeCtx({ ...wireInput("input", 0) });
    const r = await nullCheckExec.execute(makeNode("null-check", { fallback: "x" }), null, ctx);
    expect(r.value).toBe(0);
  });

  it("passes through false as a valid non-null value", async () => {
    const ctx = makeCtx({ ...wireInput("input", false) });
    const r = await nullCheckExec.execute(makeNode("null-check", { fallback: "x" }), null, ctx);
    expect(r.value).toBe(false);
  });

  it("returns static fallback when no input is connected", async () => {
    const r = await nullCheckExec.execute(makeNode("null-check", { fallback: "no-input" }), null, makeCtx());
    expect(r.value).toBe("no-input");
  });

  it("propagates active=false from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await nullCheckExec.execute(makeNode("null-check", { fallback: "x" }), null, ctx);
    expect(r.active).toBe(false);
  });
});

// ─── Merge ────────────────────────────────────────────────────────────────────

describe("merge executor", () => {
  it("returns inactive when no inputs are active", async () => {
    const r = await mergeExec.execute(makeNode("merge", { mode: "first", inputCount: 2 }), null, makeCtx());
    expect(r.active).toBe(false);
  });

  it("mode=first: returns the first active input value", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": "first", "input-1": "second" }) });
    const r = await mergeExec.execute(makeNode("merge", { mode: "first", inputCount: 2 }), null, ctx);
    expect(r.value).toBe("first");
  });

  it("mode=first: returns second value when first input is not connected", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-1": "second" }) });
    const r = await mergeExec.execute(makeNode("merge", { mode: "first", inputCount: 2 }), null, ctx);
    expect(r.value).toBe("second");
  });

  it("mode=join: joins all active values with the separator", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": "a", "input-1": "b", "input-2": "c" }) });
    const r = await mergeExec.execute(makeNode("merge", { mode: "join", inputCount: 3, separator: "-" }), null, ctx);
    expect(r.value).toBe("a-b-c");
  });

  it("mode=join: joins with empty separator", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": "foo", "input-1": "bar" }) });
    const r = await mergeExec.execute(makeNode("merge", { mode: "join", inputCount: 2, separator: "" }), null, ctx);
    expect(r.value).toBe("foobar");
  });

  it("mode=object: builds an object keyed by slotKeys", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": "Alice", "input-1": 30 }) });
    const r = await mergeExec.execute(makeNode("merge", {
      mode: "object",
      inputCount: 2,
      slotKeys: ["name", "age"],
    }), null, ctx);
    expect(r.value).toEqual({ name: "Alice", age: 30 });
  });

  it("mode=object: falls back to fieldN key when slotKeys is too short", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": "x" }) });
    const r = await mergeExec.execute(makeNode("merge", { mode: "object", inputCount: 1, slotKeys: [] }), null, ctx);
    expect(r.value).toEqual({ field0: "x" });
  });

  it("skips inactive inputs in mode=join", async () => {
    const fakeActive:   WorkflowNode = { id: "a", type: "text", data: {} };
    const fakeInactive: WorkflowNode = { id: "b", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => {
        if (h === "input-0") return { node: fakeActive,   sourceHandle: null };
        if (h === "input-1") return { node: fakeInactive, sourceHandle: null };
        return null;
      },
      evalInput: async (src) => {
        if (src.node.id === "a") return { value: "alive", inputTokens: 0, outputTokens: 0 };
        return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };
      },
    });
    const r = await mergeExec.execute(makeNode("merge", { mode: "join", inputCount: 2, separator: "," }), null, ctx);
    expect(r.value).toBe("alive");
  });
});

// ─── Sentiment ────────────────────────────────────────────────────────────────

describe("sentiment executor", () => {
  it("throws when input is not connected", async () => {
    await expect(sentimentExec.execute(makeNode("sentiment", {}), "score", makeCtx())).rejects.toThrow("no input connected");
  });

  it("returns a numeric score for sourceHandle='score'", async () => {
    const ctx = makeCtx({ ...wireInput("input", "I love this!") });
    const r = await sentimentExec.execute(makeNode("sentiment", {}), "score", ctx);
    expect(typeof r.value).toBe("number");
  });

  it("returns 'positive' label for clearly positive text", async () => {
    const ctx = makeCtx({ ...wireInput("input", "I absolutely love and adore this amazing product!") });
    const r = await sentimentExec.execute(makeNode("sentiment", { positiveThreshold: 0.05 }), "label", ctx);
    expect(r.value).toBe("positive");
  });

  it("returns 'negative' label for clearly negative text", async () => {
    const ctx = makeCtx({ ...wireInput("input", "I hate this awful terrible product!") });
    const r = await sentimentExec.execute(makeNode("sentiment", { negativeThreshold: -0.05 }), "label", ctx);
    expect(r.value).toBe("negative");
  });

  it("routes to 'positive' handle for positive text", async () => {
    const ctx = makeCtx({ ...wireInput("input", "wonderful and fantastic, I love it!") });
    const r = await sentimentExec.execute(makeNode("sentiment", { positiveThreshold: 0.05, negativeThreshold: -0.05 }), "positive", ctx);
    expect(r.active).not.toBe(false);
  });

  it("returns inactive for 'positive' handle when text is negative", async () => {
    const ctx = makeCtx({ ...wireInput("input", "I hate this awful terrible thing!") });
    const r = await sentimentExec.execute(makeNode("sentiment", { positiveThreshold: 0.05, negativeThreshold: -0.05 }), "positive", ctx);
    expect(r.active).toBe(false);
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await sentimentExec.execute(makeNode("sentiment", {}), "score", ctx);
    expect(r.active).toBe(false);
  });
});

// ─── Token Counter ────────────────────────────────────────────────────────────

describe("token-counter executor", () => {
  it("returns 0 tokens for empty string", async () => {
    const ctx = makeCtx({ ...wireInput("input", "") });
    const r = await tokenCounterExec.execute(makeNode("token-counter"), null, ctx);
    expect(r.value).toBe(0);
  });

  it("returns 0 when no input is connected", async () => {
    const r = await tokenCounterExec.execute(makeNode("token-counter"), null, makeCtx());
    expect(r.value).toBe(0);
  });

  it("returns a positive count for a non-empty string", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello world") });
    const r = await tokenCounterExec.execute(makeNode("token-counter"), null, ctx);
    expect(typeof r.value).toBe("number");
    expect(r.value as number).toBeGreaterThan(0);
  });

  it("returns more tokens for longer text", async () => {
    const short = "hi";
    const long  = "hello world, this is a much longer sentence with more tokens";
    const ctxS = makeCtx({ ...wireInput("input", short) });
    const ctxL = makeCtx({ ...wireInput("input", long) });
    const rS = await tokenCounterExec.execute(makeNode("token-counter"), null, ctxS);
    const rL = await tokenCounterExec.execute(makeNode("token-counter"), null, ctxL);
    expect(rL.value as number).toBeGreaterThan(rS.value as number);
  });

  it("propagates inactive from upstream", async () => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await tokenCounterExec.execute(makeNode("token-counter"), null, ctx);
    expect(r.active).toBe(false);
  });
});
