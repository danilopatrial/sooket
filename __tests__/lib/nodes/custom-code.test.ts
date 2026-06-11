import { describe, it, expect } from "vitest";
import { execute, isScriptTimeoutError } from "@/lib/nodes/custom-code";
import { makeNode, makeCtx, wireInput, inactive } from "./helpers";

// ─── isScriptTimeoutError ─────────────────────────────────────────────────────

describe("isScriptTimeoutError", () => {
  it("returns true for an error with ERR_SCRIPT_EXECUTION_TIMEOUT code", () => {
    const err = Object.assign(new Error("Script execution timed out after 5000ms"), {
      code: "ERR_SCRIPT_EXECUTION_TIMEOUT",
    });
    expect(isScriptTimeoutError(err)).toBe(true);
  });

  it("returns true when the message contains 'timed out' (no code)", () => {
    expect(isScriptTimeoutError(new Error("Script execution timed out"))).toBe(true);
  });

  it("returns true for a non-Error whose string includes 'timed out'", () => {
    expect(isScriptTimeoutError("operation timed out")).toBe(true);
  });

  it("returns false for a SyntaxError from malformed code", () => {
    expect(isScriptTimeoutError(new SyntaxError("Unexpected token ')'"))).toBe(false);
  });

  it("returns false for a generic runtime error", () => {
    expect(isScriptTimeoutError(new Error("boom"))).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isScriptTimeoutError(null)).toBe(false);
    expect(isScriptTimeoutError(undefined)).toBe(false);
  });
});

// ─── custom-code executor ─────────────────────────────────────────────────────

describe("custom-code executor", () => {
  it("throws when no input is connected", async () => {
    await expect(
      execute.execute(makeNode("custom-code", { code: "return 1;" }), null, makeCtx())
    ).rejects.toThrow("no input connected");
  });

  it("propagates inactive from upstream", async () => {
    const ctx = makeCtx({
      inputFor: (h) => (h === "input" ? { node: makeNode("text"), sourceHandle: null, connectionType: "main" as const } : null),
      evalInput: async () => inactive(),
    });
    const r = await execute.execute(makeNode("custom-code", { code: "return 1;" }), null, ctx);
    expect(r.active).toBe(false);
  });

  it("throws when no code is provided", async () => {
    const ctx = makeCtx(wireInput("input", 5));
    await expect(
      execute.execute(makeNode("custom-code", { code: "   " }), null, ctx)
    ).rejects.toThrow("no code provided");
  });

  it("executes code and returns the result", async () => {
    const ctx = makeCtx(wireInput("input", 21));
    const r = await execute.execute(makeNode("custom-code", { code: "return input * 2;" }), null, ctx);
    expect(r.value).toBe(42);
  });

  it("supports await in user code", async () => {
    const ctx = makeCtx(wireInput("input", 3));
    const r = await execute.execute(
      makeNode("custom-code", { code: "const x = await Promise.resolve(input + 1); return x;" }),
      null,
      ctx
    );
    expect(r.value).toBe(4);
  });

  it("does NOT expose host timers (closed escape + deferred-callback hazard)", async () => {
    const ctx = makeCtx(wireInput("input", 1));
    const r = await execute.execute(
      makeNode("custom-code", { code: "return [typeof setTimeout, typeof clearTimeout].join(',');" }),
      null,
      ctx
    );
    expect(r.value).toBe("undefined,undefined");
  });

  it("still supports async via the context Promise intrinsic (no timers needed)", async () => {
    const ctx = makeCtx(wireInput("input", 20));
    const r = await execute.execute(
      makeNode("custom-code", { code: "const x = await Promise.resolve(input + 1); return x * 2;" }),
      null,
      ctx
    );
    expect(r.value).toBe(42);
  });

  it("throws a clear error for non-JSON-serializable input (circular reference)", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const ctx = makeCtx(wireInput("input", circular as unknown as number));
    await expect(
      execute.execute(makeNode("custom-code", { code: "return 1;" }), null, ctx)
    ).rejects.toThrow(/not JSON-serializable/);
  });

  it("labels a SyntaxError as a compile/parse error, not a timeout", async () => {
    const ctx = makeCtx(wireInput("input", 1));
    await expect(
      execute.execute(makeNode("custom-code", { code: "return (" }), null, ctx)
    ).rejects.toThrow(/Custom Code compile\/parse error/);
  });

  it("labels a thrown error as a runtime error", async () => {
    const ctx = makeCtx(wireInput("input", 1));
    // The user's Error is constructed in the vm's own context, so the outer
    // `instanceof Error` check fails and the message falls back to String(err)
    // ("Error: boom"). Either way it is reported as a runtime error.
    await expect(
      execute.execute(makeNode("custom-code", { code: "throw new Error('boom');" }), null, ctx)
    ).rejects.toThrow(/Custom Code runtime error: .*boom/);
  });
});

// ─── sandbox hardening / escape closure ───────────────────────────────────────

describe("custom-code sandbox hardening", () => {
  const run = (code: string, input: unknown = 1) =>
    execute.execute(makeNode("custom-code", { code }), null, makeCtx(wireInput("input", input as number)));

  it.each([
    ["process", "return typeof process;"],
    ["require", "return typeof require;"],
    ["Buffer", "return typeof Buffer;"],
    ["global", "return typeof global;"],
    ["fetch", "return typeof fetch;"],
    ["globalThis.process", "return typeof globalThis.process;"],
  ])("host global %s is not reachable", async (_name, code) => {
    const r = await run(code);
    expect(r.value).toBe("undefined");
  });

  it.each([
    ["input.constructor", `return input.constructor.constructor("return process")().pid;`],
    ["array.constructor", `return [].constructor.constructor("return process")().pid;`],
    ["object.constructor", `return ({}).constructor.constructor("return process")().pid;`],
    ["console.log.constructor", `return console.log.constructor.constructor("return process")().pid;`],
  ])("the constructor-chain escape via %s does not reach the host process", async (_name, code) => {
    // Pre-hardening this returned the host process pid (full RCE). Now the
    // constructor chain stays inside the context, so `process` is undefined and
    // the call throws a runtime ReferenceError instead of escaping.
    await expect(run(code)).rejects.toThrow(/Custom Code runtime error/);
  });

  it("retains context-local ECMAScript intrinsics for legitimate code", async () => {
    const r = await run(
      "return [typeof JSON, typeof Math, typeof Date, typeof Map, typeof Promise, typeof parseInt].join(',');"
    );
    expect(r.value).toBe("object,object,function,function,function,function");
  });

  it("silenced console is present and does not throw", async () => {
    const r = await run('console.log("nope"); console.error("nope"); return "ok";');
    expect(r.value).toBe("ok");
  });

  it("reads nested input cloned into the context", async () => {
    const r = await run("return input.a.b + input.c;", { a: { b: 40 }, c: 2 });
    expect(r.value).toBe(42);
  });
});
