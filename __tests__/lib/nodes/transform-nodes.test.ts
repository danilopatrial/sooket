import { describe, it, expect } from "vitest";
import { execute as mathExec }         from "@/lib/nodes/math";
import { execute as concatExec }       from "@/lib/nodes/concat";
import { execute as arrayLengthExec }  from "@/lib/nodes/array-length";
import { execute as sizeOfExec }       from "@/lib/nodes/size-of";
import { execute as pickExec }         from "@/lib/nodes/pick";
import { execute as typeCastExec }     from "@/lib/nodes/type-cast";
import { execute as regexReplaceExec } from "@/lib/nodes/regex-replace";
import { execute as stringOpsExec }    from "@/lib/nodes/string-ops";
import { makeNode, makeCtx, wireInput, wireInputs } from "./helpers";

// ─── Math ─────────────────────────────────────────────────────────────────────

describe("math executor", () => {
  it("adds static defaults when no inputs are connected", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "+", defaultA: 3, defaultB: 4 }), null, makeCtx());
    expect(r.value).toBe(7);
  });

  it("uses connected inputs over defaults", async () => {
    const ctx = makeCtx({ ...wireInputs({ a: 10, b: 5 }) });
    const r = await mathExec.execute(makeNode("math", { operator: "+", defaultA: 0, defaultB: 0 }), null, ctx);
    expect(r.value).toBe(15);
  });

  it("subtracts correctly", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "-", defaultA: 10, defaultB: 3 }), null, makeCtx());
    expect(r.value).toBe(7);
  });

  it("multiplies correctly", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "*", defaultA: 6, defaultB: 7 }), null, makeCtx());
    expect(r.value).toBe(42);
  });

  it("divides correctly", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "/", defaultA: 10, defaultB: 4 }), null, makeCtx());
    expect(r.value).toBe(2.5);
  });

  it("throws on division by zero", async () => {
    await expect(mathExec.execute(makeNode("math", { operator: "/", defaultA: 5, defaultB: 0 }), null, makeCtx())).rejects.toThrow("division by zero");
  });

  it("throws on modulo by zero", async () => {
    await expect(mathExec.execute(makeNode("math", { operator: "%", defaultA: 5, defaultB: 0 }), null, makeCtx())).rejects.toThrow("modulo by zero");
  });

  it("computes modulo", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "%", defaultA: 10, defaultB: 3 }), null, makeCtx());
    expect(r.value).toBe(1);
  });

  it("computes power", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "**", defaultA: 2, defaultB: 8 }), null, makeCtx());
    expect(r.value).toBe(256);
  });

  it("returns min of two numbers", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "min", defaultA: 3, defaultB: 7 }), null, makeCtx());
    expect(r.value).toBe(3);
  });

  it("returns max of two numbers", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "max", defaultA: 3, defaultB: 7 }), null, makeCtx());
    expect(r.value).toBe(7);
  });

  it("returns abs value of A", async () => {
    const r = await mathExec.execute(makeNode("math", { operator: "abs", defaultA: -9, defaultB: 0 }), null, makeCtx());
    expect(r.value).toBe(9);
  });

  it("throws when A input is non-numeric", async () => {
    const ctx = makeCtx({ ...wireInputs({ a: "hello", b: 2 }) });
    await expect(mathExec.execute(makeNode("math", { operator: "+" }), null, ctx)).rejects.toThrow("non-numeric");
  });

  it("throws when B input is non-numeric", async () => {
    const ctx = makeCtx({ ...wireInputs({ a: 2, b: "world" }) });
    await expect(mathExec.execute(makeNode("math", { operator: "+" }), null, ctx)).rejects.toThrow("non-numeric");
  });

  it("defaults operator to + and returns 0 when no config is provided", async () => {
    const r = await mathExec.execute(makeNode("math", {}), null, makeCtx());
    expect(r.value).toBe(0);
  });
});

// ─── Concat ───────────────────────────────────────────────────────────────────

describe("concat executor", () => {
  it("joins two connected inputs with the configured separator", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": "hello", "input-1": "world" }) });
    const r = await concatExec.execute(makeNode("concat", { separator: " ", inputCount: 2 }), null, ctx);
    expect(r.value).toBe("hello world");
  });

  it("concatenates without separator when separator is empty", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": "foo", "input-1": "bar" }) });
    const r = await concatExec.execute(makeNode("concat", { separator: "", inputCount: 2 }), null, ctx);
    expect(r.value).toBe("foobar");
  });

  it("skips unconnected inputs", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": "only" }) });
    const r = await concatExec.execute(makeNode("concat", { separator: "-", inputCount: 3 }), null, ctx);
    expect(r.value).toBe("only");
  });

  it("returns empty string when no inputs are connected", async () => {
    const r = await concatExec.execute(makeNode("concat", { separator: "-", inputCount: 2 }), null, makeCtx());
    expect(r.value).toBe("");
  });

  it("propagates inactive state from any connected input", async () => {
    const fakeNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input-0" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await concatExec.execute(makeNode("concat", { separator: "", inputCount: 2 }), null, ctx);
    expect(r.active).toBe(false);
  });

  it("coerces numbers to strings", async () => {
    const ctx = makeCtx({ ...wireInputs({ "input-0": 42, "input-1": 8 }) });
    const r = await concatExec.execute(makeNode("concat", { separator: "+", inputCount: 2 }), null, ctx);
    expect(r.value).toBe("42+8");
  });
});

// ─── Array Length ──────────────────────────────────────────────────────────────

describe("array-length executor", () => {
  it("throws when input is not connected", async () => {
    await expect(arrayLengthExec.execute(makeNode("array-length"), null, makeCtx())).rejects.toThrow("no input connected");
  });

  it("returns length of an array", async () => {
    const ctx = makeCtx({ ...wireInput("input", [1, 2, 3]) });
    const r = await arrayLengthExec.execute(makeNode("array-length"), null, ctx);
    expect(r.value).toBe(3);
  });

  it("returns 0 for an empty array", async () => {
    const ctx = makeCtx({ ...wireInput("input", []) });
    const r = await arrayLengthExec.execute(makeNode("array-length"), null, ctx);
    expect(r.value).toBe(0);
  });

  it("returns character length for a string input", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await arrayLengthExec.execute(makeNode("array-length"), null, ctx);
    expect(r.value).toBe(5);
  });

  it("returns key count for an object input", async () => {
    const ctx = makeCtx({ ...wireInput("input", { a: 1, b: 2, c: 3 }) });
    const r = await arrayLengthExec.execute(makeNode("array-length"), null, ctx);
    expect(r.value).toBe(3);
  });

  it("returns 0 for non-countable inputs (number)", async () => {
    const ctx = makeCtx({ ...wireInput("input", 42) });
    const r = await arrayLengthExec.execute(makeNode("array-length"), null, ctx);
    expect(r.value).toBe(0);
  });
});

// ─── Size Of ──────────────────────────────────────────────────────────────────

describe("size-of executor", () => {
  it("returns 0 when no input is connected", async () => {
    const r = await sizeOfExec.execute(makeNode("size-of"), null, makeCtx());
    expect(r.value).toBe(0);
  });

  it("returns character count of a string", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello") });
    const r = await sizeOfExec.execute(makeNode("size-of"), null, ctx);
    expect(r.value).toBe(5);
  });

  it("returns element count of an array", async () => {
    const ctx = makeCtx({ ...wireInput("input", [1, 2, 3, 4]) });
    const r = await sizeOfExec.execute(makeNode("size-of"), null, ctx);
    expect(r.value).toBe(4);
  });

  it("returns key count of an object", async () => {
    const ctx = makeCtx({ ...wireInput("input", { x: 1, y: 2 }) });
    const r = await sizeOfExec.execute(makeNode("size-of"), null, ctx);
    expect(r.value).toBe(2);
  });

  it("returns string length of a number (serialized)", async () => {
    const ctx = makeCtx({ ...wireInput("input", 12345) });
    const r = await sizeOfExec.execute(makeNode("size-of"), null, ctx);
    expect(r.value).toBe(5); // "12345".length
  });

  it("returns 0 for null input", async () => {
    const ctx = makeCtx({ ...wireInput("input", null) });
    const r = await sizeOfExec.execute(makeNode("size-of"), null, ctx);
    expect(r.value).toBe(0); // toText(null) === ""
  });
});

// ─── Pick ─────────────────────────────────────────────────────────────────────

describe("pick executor", () => {
  it("throws when input is not connected", async () => {
    await expect(pickExec.execute(makeNode("pick", { key: "x" }), null, makeCtx())).rejects.toThrow("no object input connected");
  });

  it("picks a key from an object", async () => {
    const ctx = makeCtx({ ...wireInput("input", { name: "Alice", age: 30 }) });
    const r = await pickExec.execute(makeNode("pick", { key: "name" }), null, ctx);
    expect(r.value).toBe("Alice");
  });

  it("returns undefined for a missing key", async () => {
    const ctx = makeCtx({ ...wireInput("input", { a: 1 }) });
    const r = await pickExec.execute(makeNode("pick", { key: "b" }), null, ctx);
    expect(r.value).toBeUndefined();
  });

  it("picks an array element by numeric index", async () => {
    const ctx = makeCtx({ ...wireInput("input", ["a", "b", "c"]) });
    const r = await pickExec.execute(makeNode("pick", { key: "1" }), null, ctx);
    expect(r.value).toBe("b");
  });

  it("returns undefined for out-of-range array index", async () => {
    const ctx = makeCtx({ ...wireInput("input", ["a", "b"]) });
    const r = await pickExec.execute(makeNode("pick", { key: "5" }), null, ctx);
    expect(r.value).toBeUndefined();
  });

  it("returns undefined for a non-numeric key on an array", async () => {
    const ctx = makeCtx({ ...wireInput("input", [1, 2, 3]) });
    const r = await pickExec.execute(makeNode("pick", { key: "foo" }), null, ctx);
    expect(r.value).toBeUndefined();
  });

  it("propagates active=false from upstream", async () => {
    const fakeNode = { id: "upstream", type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => h === "input" ? { node: fakeNode, sourceHandle: null } : null,
      evalInput: async () => ({ value: undefined, active: false, inputTokens: 0, outputTokens: 0 }),
    });
    const r = await pickExec.execute(makeNode("pick", { key: "x" }), null, ctx);
    expect(r.active).toBe(false);
  });

  it("picks key from a connected key input, overriding node config", async () => {
    const fakeInputNode = { id: "upstream-input", type: "text", data: {} };
    const fakeKeyNode   = { id: "upstream-key",   type: "text", data: {} };
    const ctx = makeCtx({
      inputFor: (h) => {
        if (h === "input") return { node: fakeInputNode, sourceHandle: null };
        if (h === "key")   return { node: fakeKeyNode,   sourceHandle: null };
        return null;
      },
      evalInput: async (src) => {
        if (src.node.id === "upstream-input") return { value: { foo: "bar", baz: 99 }, inputTokens: 0, outputTokens: 0 };
        return { value: "foo", inputTokens: 0, outputTokens: 0 };
      },
    });
    const r = await pickExec.execute(makeNode("pick", { key: "baz" }), null, ctx);
    expect(r.value).toBe("bar");
  });
});

// ─── Type Cast ────────────────────────────────────────────────────────────────

describe("type-cast executor", () => {
  it("throws when input is not connected", async () => {
    await expect(typeCastExec.execute(makeNode("type-cast", { target: "string" }), null, makeCtx())).rejects.toThrow("no input connected");
  });

  it("casts to string (default)", async () => {
    const ctx = makeCtx({ ...wireInput("input", 42) });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "string" }), null, ctx);
    expect(r.value).toBe("42");
  });

  it("casts to number", async () => {
    const ctx = makeCtx({ ...wireInput("input", "3.14") });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "number" }), null, ctx);
    expect(r.value).toBe(3.14);
  });

  it("casts truthy string to boolean true", async () => {
    const ctx = makeCtx({ ...wireInput("input", "yes") });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "boolean" }), null, ctx);
    expect(r.value).toBe(true);
  });

  it("casts 'false' string to boolean false", async () => {
    const ctx = makeCtx({ ...wireInput("input", "false") });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "boolean" }), null, ctx);
    expect(r.value).toBe(false);
  });

  it("casts 'no' string to boolean false", async () => {
    const ctx = makeCtx({ ...wireInput("input", "no") });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "boolean" }), null, ctx);
    expect(r.value).toBe(false);
  });

  it("casts '0' string to boolean false", async () => {
    const ctx = makeCtx({ ...wireInput("input", "0") });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "boolean" }), null, ctx);
    expect(r.value).toBe(false);
  });

  it("casts number 0 to boolean false", async () => {
    const ctx = makeCtx({ ...wireInput("input", 0) });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "boolean" }), null, ctx);
    expect(r.value).toBe(false);
  });

  it("casts number 1 to boolean true", async () => {
    const ctx = makeCtx({ ...wireInput("input", 1) });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "boolean" }), null, ctx);
    expect(r.value).toBe(true);
  });

  it("casts boolean true to string 'true'", async () => {
    const ctx = makeCtx({ ...wireInput("input", true) });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "string" }), null, ctx);
    expect(r.value).toBe("true");
  });

  it("casts object to JSON string", async () => {
    const ctx = makeCtx({ ...wireInput("input", { a: 1 }) });
    const r = await typeCastExec.execute(makeNode("type-cast", { target: "string" }), null, ctx);
    expect(r.value).toBe('{"a":1}');
  });
});

// ─── Regex Replace ────────────────────────────────────────────────────────────

describe("regex-replace executor", () => {
  it("replaces matching pattern with replacement string", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello world") });
    const r = await regexReplaceExec.execute(makeNode("regex-replace", { pattern: "world", replace: "there", flags: "g" }), null, ctx);
    expect(r.value).toBe("hello there");
  });

  it("returns original string when pattern is empty", async () => {
    const ctx = makeCtx({ ...wireInput("input", "unchanged") });
    const r = await regexReplaceExec.execute(makeNode("regex-replace", { pattern: "", replace: "x", flags: "g" }), null, ctx);
    expect(r.value).toBe("unchanged");
  });

  it("replaces all occurrences with 'g' flag", async () => {
    const ctx = makeCtx({ ...wireInput("input", "aaa") });
    const r = await regexReplaceExec.execute(makeNode("regex-replace", { pattern: "a", replace: "b", flags: "g" }), null, ctx);
    expect(r.value).toBe("bbb");
  });

  it("replaces only first occurrence without 'g' flag", async () => {
    const ctx = makeCtx({ ...wireInput("input", "aaa") });
    const r = await regexReplaceExec.execute(makeNode("regex-replace", { pattern: "a", replace: "b", flags: "" }), null, ctx);
    expect(r.value).toBe("baa");
  });

  it("returns empty string when input is empty", async () => {
    const ctx = makeCtx({ ...wireInput("input", "") });
    const r = await regexReplaceExec.execute(makeNode("regex-replace", { pattern: "x", replace: "y", flags: "g" }), null, ctx);
    expect(r.value).toBe("");
  });

  it("throws on invalid regex pattern", async () => {
    const ctx = makeCtx({ ...wireInput("input", "test") });
    await expect(
      regexReplaceExec.execute(makeNode("regex-replace", { pattern: "[invalid", replace: "", flags: "g" }), null, ctx)
    ).rejects.toThrow("invalid pattern");
  });

  it("works with capture group replacement", async () => {
    const ctx = makeCtx({ ...wireInput("input", "2024-01-15") });
    const r = await regexReplaceExec.execute(makeNode("regex-replace", { pattern: "(\\d{4})-(\\d{2})-(\\d{2})", replace: "$3/$2/$1", flags: "g" }), null, ctx);
    expect(r.value).toBe("15/01/2024");
  });

  it("handles case-insensitive flag", async () => {
    const ctx = makeCtx({ ...wireInput("input", "Hello WORLD") });
    const r = await regexReplaceExec.execute(makeNode("regex-replace", { pattern: "hello", replace: "hi", flags: "gi" }), null, ctx);
    expect(r.value).toBe("hi WORLD");
  });
});

// ─── String Ops ───────────────────────────────────────────────────────────────

describe("string-ops executor", () => {
  it("throws when input is not connected", async () => {
    await expect(stringOpsExec.execute(makeNode("string-ops", { op: "uppercase" }), null, makeCtx())).rejects.toThrow("no input connected");
  });

  it("uppercases the input string", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello world") });
    const r = await stringOpsExec.execute(makeNode("string-ops", { op: "uppercase" }), null, ctx);
    expect(r.value).toBe("HELLO WORLD");
  });

  it("lowercases the input string", async () => {
    const ctx = makeCtx({ ...wireInput("input", "HELLO WORLD") });
    const r = await stringOpsExec.execute(makeNode("string-ops", { op: "lowercase" }), null, ctx);
    expect(r.value).toBe("hello world");
  });

  it("trims whitespace", async () => {
    const ctx = makeCtx({ ...wireInput("input", "  hello  ") });
    const r = await stringOpsExec.execute(makeNode("string-ops", { op: "trim" }), null, ctx);
    expect(r.value).toBe("hello");
  });

  it("splits string by separator", async () => {
    const ctx = makeCtx({ ...wireInput("input", "a,b,c") });
    const r = await stringOpsExec.execute(makeNode("string-ops", { op: "split", separator: "," }), null, ctx);
    expect(r.value).toEqual(["a", "b", "c"]);
  });

  it("slices from start index when sliceEndEnabled is false", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello world") });
    const r = await stringOpsExec.execute(makeNode("string-ops", { op: "slice", sliceStart: 6, sliceEndEnabled: false }), null, ctx);
    expect(r.value).toBe("world");
  });

  it("slices between start and end when sliceEndEnabled is true", async () => {
    const ctx = makeCtx({ ...wireInput("input", "hello world") });
    const r = await stringOpsExec.execute(makeNode("string-ops", { op: "slice", sliceStart: 0, sliceEnd: 5, sliceEndEnabled: true }), null, ctx);
    expect(r.value).toBe("hello");
  });

  it("returns input unchanged for unknown op", async () => {
    const ctx = makeCtx({ ...wireInput("input", "unchanged") });
    const r = await stringOpsExec.execute(makeNode("string-ops", { op: "unknown_op" }), null, ctx);
    expect(r.value).toBe("unchanged");
  });
});
