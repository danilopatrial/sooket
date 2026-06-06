import { describe, it, expect } from "vitest";
import { execute as booleanExec } from "@/lib/nodes/boolean";
import { execute as textExec }    from "@/lib/nodes/text";
import { execute as numberExec }  from "@/lib/nodes/number";
import { makeNode, makeCtx } from "./helpers";

// ─── Boolean ─────────────────────────────────────────────────────────────────

describe("boolean executor", () => {
  it("returns true when data.value is true", async () => {
    const r = await booleanExec.execute(makeNode("boolean", { value: true }), null, makeCtx());
    expect(r.value).toBe(true);
  });

  it("returns false when data.value is false", async () => {
    const r = await booleanExec.execute(makeNode("boolean", { value: false }), null, makeCtx());
    expect(r.value).toBe(false);
  });

  it("defaults to false when data.value is undefined", async () => {
    const r = await booleanExec.execute(makeNode("boolean", {}), null, makeCtx());
    expect(r.value).toBe(false);
  });

  it("returns zero tokens", async () => {
    const r = await booleanExec.execute(makeNode("boolean", { value: true }), null, makeCtx());
    expect(r.inputTokens).toBe(0);
    expect(r.outputTokens).toBe(0);
  });
});

// ─── Text ─────────────────────────────────────────────────────────────────────

describe("text executor", () => {
  it("returns the static text string", async () => {
    const r = await textExec.execute(makeNode("text", { text: "hello world" }), null, makeCtx());
    expect(r.value).toBe("hello world");
  });

  it("returns empty string when text is empty", async () => {
    const r = await textExec.execute(makeNode("text", { text: "" }), null, makeCtx());
    expect(r.value).toBe("");
  });

  it("returns empty string when data.text is undefined", async () => {
    const r = await textExec.execute(makeNode("text", {}), null, makeCtx());
    expect(r.value).toBe("");
  });

  it("interpolates $VARIABLE placeholders from vars map", async () => {
    const vars = new Map([["NAME", "Alice"]]);
    const r = await textExec.execute(makeNode("text", { text: "Hello $NAME" }), null, makeCtx({ vars }));
    expect(r.value).toBe("Hello Alice");
  });

  it("leaves unknown $VARIABLES as-is", async () => {
    const r = await textExec.execute(makeNode("text", { text: "Hello $UNKNOWN" }), null, makeCtx());
    expect(r.value).toBe("Hello $UNKNOWN");
  });

  it("returns zero tokens", async () => {
    const r = await textExec.execute(makeNode("text", { text: "x" }), null, makeCtx());
    expect(r.inputTokens).toBe(0);
    expect(r.outputTokens).toBe(0);
  });
});

// ─── Number ──────────────────────────────────────────────────────────────────

describe("number executor", () => {
  it("returns fixedValue when set", async () => {
    const r = await numberExec.execute(makeNode("number", { fixedValue: 42 }), null, makeCtx());
    expect(r.value).toBe(42);
  });

  it("prefers fixedValue over value when both are set", async () => {
    const r = await numberExec.execute(makeNode("number", { fixedValue: 10, value: 0.5 }), null, makeCtx());
    expect(r.value).toBe(10);
  });

  it("falls back to value when fixedValue is null", async () => {
    const r = await numberExec.execute(makeNode("number", { fixedValue: null, value: 0.75 }), null, makeCtx());
    expect(r.value).toBe(0.75);
  });

  it("returns 0 when both fixedValue and value are absent", async () => {
    const r = await numberExec.execute(makeNode("number", {}), null, makeCtx());
    expect(r.value).toBe(0);
  });

  it("handles negative numbers", async () => {
    const r = await numberExec.execute(makeNode("number", { fixedValue: -5 }), null, makeCtx());
    expect(r.value).toBe(-5);
  });

  it("handles float values", async () => {
    const r = await numberExec.execute(makeNode("number", { fixedValue: 3.14 }), null, makeCtx());
    expect(r.value).toBe(3.14);
  });

  it("returns zero tokens", async () => {
    const r = await numberExec.execute(makeNode("number", { fixedValue: 1 }), null, makeCtx());
    expect(r.inputTokens).toBe(0);
    expect(r.outputTokens).toBe(0);
  });
});
