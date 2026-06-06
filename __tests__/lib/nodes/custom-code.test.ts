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

  it("exposes setTimeout so async-delay code runs instead of throwing ReferenceError", async () => {
    const ctx = makeCtx(wireInput("input", "x"));
    const r = await execute.execute(
      makeNode("custom-code", {
        code: 'await new Promise((res) => setTimeout(res, 5)); return "late";',
      }),
      null,
      ctx
    );
    expect(r.value).toBe("late");
  });

  it("exposes clearTimeout in the sandbox", async () => {
    const ctx = makeCtx(wireInput("input", 1));
    const r = await execute.execute(
      makeNode("custom-code", {
        code: "const t = setTimeout(() => {}, 1000); clearTimeout(t); return typeof clearTimeout;",
      }),
      null,
      ctx
    );
    expect(r.value).toBe("function");
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
