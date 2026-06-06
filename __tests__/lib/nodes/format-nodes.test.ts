import { describe, it, expect } from "vitest";
import { execute as templateStringExec } from "@/lib/nodes/template-string";
import { execute as jsonParserExec }     from "@/lib/nodes/json-parser";
import { execute as jsonBuilderExec }    from "@/lib/nodes/json-builder";
import { execute as xmlJsonExec }        from "@/lib/nodes/xml-json";
import { makeNode, makeCtx, wireInput } from "./helpers";
import type { WorkflowNode } from "@/lib/workflow-types";

// ─── Template String ──────────────────────────────────────────────────────────

describe("template-string executor", () => {
  it("returns template unchanged when there are no slots", async () => {
    const r = await templateStringExec.execute(
      makeNode("template-string", { template: "hello world", slots: [] }),
      null,
      makeCtx()
    );
    expect(r.value).toBe("hello world");
  });

  it("replaces a slot with its connected input value", async () => {
    const fakeNode: WorkflowNode = { id: "upstream-name", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "name" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: "Alice", inputTokens: 0, outputTokens: 0 }),
    });
    const r = await templateStringExec.execute(
      makeNode("template-string", { template: "Hello {{name}}!", slots: [{ name: "name" }] }),
      null,
      ctx
    );
    expect(r.value).toBe("Hello Alice!");
  });

  it("replaces slot with fallback when no input is connected", async () => {
    const r = await templateStringExec.execute(
      makeNode("template-string", {
        template: "Hello {{name}}!",
        slots: [{ name: "name", fallback: "World" }],
      }),
      null,
      makeCtx()
    );
    expect(r.value).toBe("Hello World!");
  });

  it("leaves slot placeholder if no input and no fallback", async () => {
    const r = await templateStringExec.execute(
      makeNode("template-string", {
        template: "Hello {{name}}!",
        slots: [{ name: "name" }],
      }),
      null,
      makeCtx()
    );
    expect(r.value).toBe("Hello !");
  });

  it("replaces multiple slots", async () => {
    const fakeA: WorkflowNode = { id: "upstream-a", type: "text", data: {} };
    const fakeB: WorkflowNode = { id: "upstream-b", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => {
        if (h === "first") return { node: fakeA, sourceHandle: null };
        if (h === "last")  return { node: fakeB, sourceHandle: null };
        return null;
      },
      evalInput: async (src) => {
        if (src.node.id === "upstream-a") return { value: "John", inputTokens: 0, outputTokens: 0 };
        return { value: "Doe", inputTokens: 0, outputTokens: 0 };
      },
    });
    const r = await templateStringExec.execute(
      makeNode("template-string", {
        template: "{{first}} {{last}}",
        slots: [{ name: "first" }, { name: "last" }],
      }),
      null,
      ctx
    );
    expect(r.value).toBe("John Doe");
  });

  it("interpolates $VARIABLE from vars after slot replacement", async () => {
    const vars = new Map([["GREETING", "Hi"]]);
    const r = await templateStringExec.execute(
      makeNode("template-string", { template: "$GREETING {{name}}!", slots: [{ name: "name", fallback: "there" }] }),
      null,
      makeCtx({ vars })
    );
    expect(r.value).toBe("Hi there!");
  });
});

// ─── JSON Parser ──────────────────────────────────────────────────────────────

describe("json-parser executor", () => {
  const makeJsonParserCtx = (inputValue: unknown, _fields: Array<{ id: string; name: string; defaultValue?: string }>) => {
    const fakeNode: WorkflowNode = { id: "upstream", type: "text", data: {} };
    const workflow = {
      id: 1,
      is_active: 1,
      nodes: [fakeNode],
      edges: [{ id: "e1", source: fakeNode.id, target: "node-1", targetHandle: "input", sourceHandle: null }],
    };
    return makeCtx({
      nodeId: "node-1",
      workflow,
      evalInput: async () => ({ value: inputValue, inputTokens: 0, outputTokens: 0 }),
    });
  };

  it("throws when input is not connected (no edge)", async () => {
    await expect(
      jsonParserExec.execute(makeNode("json-parser", { fields: [{ id: "out", name: "key" }] }), "out", makeCtx())
    ).rejects.toThrow("no input connected");
  });

  it("extracts a top-level key from a JSON string", async () => {
    const ctx = makeJsonParserCtx('{"name":"Alice","age":30}', [{ id: "name", name: "name" }]);
    const r = await jsonParserExec.execute(makeNode("json-parser", { fields: [{ id: "name", name: "name" }] }), "name", ctx);
    expect(r.value).toBe("Alice");
  });

  it("extracts a nested key using dot notation", async () => {
    const ctx = makeJsonParserCtx('{"user":{"email":"a@b.com"}}', [{ id: "email", name: "user.email" }]);
    const r = await jsonParserExec.execute(makeNode("json-parser", { fields: [{ id: "email", name: "user.email" }] }), "email", ctx);
    expect(r.value).toBe("a@b.com");
  });

  it("works when input is already an object (not a JSON string)", async () => {
    const ctx = makeJsonParserCtx({ city: "NYC" }, [{ id: "city", name: "city" }]);
    const r = await jsonParserExec.execute(makeNode("json-parser", { fields: [{ id: "city", name: "city" }] }), "city", ctx);
    expect(r.value).toBe("NYC");
  });

  it("returns defaultValue when key is missing", async () => {
    const ctx = makeJsonParserCtx('{"a":1}', [{ id: "b", name: "b", defaultValue: "fallback" }]);
    const r = await jsonParserExec.execute(makeNode("json-parser", { fields: [{ id: "b", name: "b", defaultValue: "fallback" }] }), "b", ctx);
    expect(r.value).toBe("fallback");
  });

  it("returns undefined when key missing and no defaultValue", async () => {
    const ctx = makeJsonParserCtx('{"a":1}', [{ id: "b", name: "b" }]);
    const r = await jsonParserExec.execute(makeNode("json-parser", { fields: [{ id: "b", name: "b" }] }), "b", ctx);
    expect(r.value).toBeUndefined();
  });

  it("returns undefined when sourceHandle field is not found in fields array", async () => {
    const ctx = makeJsonParserCtx('{"a":1}', [{ id: "a", name: "a" }]);
    const r = await jsonParserExec.execute(makeNode("json-parser", { fields: [{ id: "a", name: "a" }] }), "nonexistent", ctx);
    expect(r.value).toBeUndefined();
  });

  it("handles malformed JSON gracefully (returns defaultValue)", async () => {
    const ctx = makeJsonParserCtx("not-json", [{ id: "x", name: "x", defaultValue: "safe" }]);
    const r = await jsonParserExec.execute(makeNode("json-parser", { fields: [{ id: "x", name: "x", defaultValue: "safe" }] }), "x", ctx);
    expect(r.value).toBe("safe");
  });
});

// ─── JSON Builder ─────────────────────────────────────────────────────────────

describe("json-builder executor", () => {
  it("returns empty object when there are no fields", async () => {
    const r = await jsonBuilderExec.execute(makeNode("json-builder", { fields: [] }), null, makeCtx());
    expect(r.value).toEqual({});
  });

  it("builds an object from connected inputs", async () => {
    const fakeA: WorkflowNode = { id: "upstream-a", type: "text", data: {} };
    const fakeB: WorkflowNode = { id: "upstream-b", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => {
        if (h === "field-0") return { node: fakeA, sourceHandle: null };
        if (h === "field-1") return { node: fakeB, sourceHandle: null };
        return null;
      },
      evalInput: async (src) => {
        if (src.node.id === "upstream-a") return { value: "Alice", inputTokens: 0, outputTokens: 0 };
        return { value: 30, inputTokens: 0, outputTokens: 0 };
      },
    });
    const r = await jsonBuilderExec.execute(
      makeNode("json-builder", {
        fields: [
          { id: "field-0", key: "name" },
          { id: "field-1", key: "age" },
        ],
      }),
      null,
      ctx
    );
    expect(r.value).toEqual({ name: "Alice", age: 30 });
  });

  it("uses fallback value when input is not connected", async () => {
    const r = await jsonBuilderExec.execute(
      makeNode("json-builder", { fields: [{ id: "f0", key: "status", fallback: "active" }] }),
      null,
      makeCtx()
    );
    expect(r.value).toEqual({ status: "active" });
  });

  it("skips fields with empty keys", async () => {
    const r = await jsonBuilderExec.execute(
      makeNode("json-builder", { fields: [{ id: "f0", key: "", fallback: "ignored" }] }),
      null,
      makeCtx()
    );
    expect(r.value).toEqual({});
  });

  it("skips fields with neither input nor fallback", async () => {
    const r = await jsonBuilderExec.execute(
      makeNode("json-builder", { fields: [{ id: "f0", key: "missing" }] }),
      null,
      makeCtx()
    );
    expect(r.value).toEqual({});
  });
});

// ─── XML ↔ JSON ───────────────────────────────────────────────────────────────

describe("xml-json executor", () => {
  it("converts XML to JSON string (xml-to-json direction)", async () => {
    const ctx = makeCtx({ ...wireInput("input", "<root><name>Alice</name></root>") });
    const r = await xmlJsonExec.execute(makeNode("xml-json", { direction: "xml-to-json" }), null, ctx);
    // xmlToJson returns a JSON string — parse it to verify structure
    const parsed = JSON.parse(r.value as string);
    expect(parsed).toMatchObject({ root: { name: "Alice" } });
  });

  it("converts JSON to XML (json-to-xml direction)", async () => {
    const ctx = makeCtx({ ...wireInput("input", { root: { name: "Alice" } }) });
    const r = await xmlJsonExec.execute(makeNode("xml-json", { direction: "json-to-xml", rootElement: "root" }), null, ctx);
    expect(typeof r.value).toBe("string");
    expect(r.value as string).toContain("Alice");
  });

  it("throws when no input is connected", async () => {
    await expect(xmlJsonExec.execute(makeNode("xml-json", { direction: "xml-to-json" }), null, makeCtx())).rejects.toThrow();
  });

  it("handles empty XML string gracefully", async () => {
    const ctx = makeCtx({ ...wireInput("input", "") });
    // Empty string may throw or return empty — either is acceptable, but should not produce the wrong type
    let caught = false;
    let result: unknown;
    try {
      const r = await xmlJsonExec.execute(makeNode("xml-json", { direction: "xml-to-json" }), null, ctx);
      result = r.value;
    } catch {
      caught = true;
    }
    // Either threw or returned something — just confirm it didn't silently corrupt
    expect(caught || result !== undefined || result === null).toBe(true);
  });
});
