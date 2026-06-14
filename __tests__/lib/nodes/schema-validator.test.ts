/**
 * Schema Validator node executor: validates the connected input against a
 * configured JSON Schema and routes to the `valid` / `invalid` output handles.
 */
import { describe, it, expect } from "vitest";
import { execute } from "@/lib/nodes/schema-validator";
import { makeNode, makeCtx, wireInput } from "./helpers";

const SCHEMA = JSON.stringify({
  type: "object",
  required: ["email"],
  properties: { email: { type: "string", pattern: "^[^@]+@[^@]+$" } },
});

describe("Schema Validator node", () => {
  it("passes a conforming value through the `valid` handle", async () => {
    const node = makeNode("schema-validator", { schema: SCHEMA, action: "block" });
    const ctx = makeCtx(wireInput("input", { email: "a@b.com" }));
    const res = await execute.execute(node, "valid", ctx);
    expect(res.value).toEqual({ email: "a@b.com" });
    expect(res.active).not.toBe(false);
    // the invalid handle is inactive
    expect(ctx.cache.get("node-1:invalid")?.active).toBe(false);
  });

  it("emits errors on the `invalid` handle for a non-conforming value", async () => {
    const node = makeNode("schema-validator", { schema: SCHEMA, action: "block" });
    const ctx = makeCtx(wireInput("input", { email: "not-an-email" }));
    const res = await execute.execute(node, "invalid", ctx);
    const v = res.value as { valid: boolean; errors: Array<{ path: string }>; message: string };
    expect(v.valid).toBe(false);
    expect(v.errors[0].path).toBe("$.email");
    expect(v.message).toContain("$.email");
  });

  it("blocks the `valid` handle (inactive) on failure when action=block", async () => {
    const node = makeNode("schema-validator", { schema: SCHEMA, action: "block" });
    const ctx = makeCtx(wireInput("input", {}));
    const res = await execute.execute(node, "valid", ctx);
    expect(res.active).toBe(false);
  });

  it("passes the original input through `valid` on failure when action=pass", async () => {
    const node = makeNode("schema-validator", { schema: SCHEMA, action: "pass" });
    const ctx = makeCtx(wireInput("input", { email: "bad" }));
    const res = await execute.execute(node, "valid", ctx);
    expect(res.active).not.toBe(false);
    expect(res.value).toEqual({ email: "bad" });
    // errors are still available on the invalid handle
    expect((ctx.cache.get("node-1:invalid")?.value as { valid: boolean }).valid).toBe(false);
  });

  it("propagates token usage from the input result", async () => {
    const node = makeNode("schema-validator", { schema: SCHEMA, action: "block" });
    const ctx = makeCtx(wireInput("input", { email: "a@b.com" }, { inputTokens: 7, outputTokens: 3 }));
    const res = await execute.execute(node, "valid", ctx);
    expect(res.inputTokens).toBe(7);
    expect(res.outputTokens).toBe(3);
  });

  it("short-circuits inactive when the input path is inactive", async () => {
    const node = makeNode("schema-validator", { schema: SCHEMA });
    const ctx = makeCtx({
      inputFor: () => ({ node: { id: "u", type: "text", data: {} }, sourceHandle: null, connectionType: "main" }),
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const res = await execute.execute(node, "valid", ctx);
    expect(res.active).toBe(false);
  });

  it("throws when no input is connected", async () => {
    const node = makeNode("schema-validator", { schema: SCHEMA });
    await expect(execute.execute(node, "valid", makeCtx())).rejects.toThrow(/no input connected/);
  });

  it("throws when no schema is configured", async () => {
    const node = makeNode("schema-validator", { schema: "  " });
    const ctx = makeCtx(wireInput("input", { email: "a@b.com" }));
    await expect(execute.execute(node, "valid", ctx)).rejects.toThrow(/no JSON Schema/);
  });

  it("throws a clear error when the schema is invalid JSON", async () => {
    const node = makeNode("schema-validator", { schema: "{not json" });
    const ctx = makeCtx(wireInput("input", {}));
    await expect(execute.execute(node, "valid", ctx)).rejects.toThrow(/Schema Validator: invalid JSON Schema/);
  });
});
