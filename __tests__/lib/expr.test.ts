import { describe, it, expect } from "vitest";
import {
  resolveExpr,
  resolveExpressions,
  resolveNodeData,
  extractNodeRefs,
  containsExpressions,
} from "@/lib/expr";
import type { EvalResult } from "@/lib/workflow-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(value: unknown): EvalResult {
  return { value, inputTokens: 0, outputTokens: 0 };
}

function makeCache(entries: Record<string, unknown>): Map<string, EvalResult> {
  const m = new Map<string, EvalResult>();
  for (const [key, value] of Object.entries(entries)) {
    m.set(`${key}:`, ok(value));
  }
  return m;
}

const EMPTY_BODY = {} as Record<string, unknown>;

// ─── resolveExpr ─────────────────────────────────────────────────────────────

describe("resolveExpr", () => {
  it("resolves $node.id when node has a value", () => {
    const cache = makeCache({ "text-1": "hello" });
    expect(resolveExpr("$node.text-1", cache, EMPTY_BODY, undefined)).toBe("hello");
  });

  it("resolves $node.id.field with dot-path into object value", () => {
    const cache = makeCache({ "json-1": { name: "Alice", age: 30 } });
    expect(resolveExpr("$node.json-1.name", cache, EMPTY_BODY, undefined)).toBe("Alice");
  });

  it("resolves deeply nested $node.id.a.b.c", () => {
    const cache = makeCache({ "n1": { a: { b: { c: 42 } } } });
    expect(resolveExpr("$node.n1.a.b.c", cache, EMPTY_BODY, undefined)).toBe(42);
  });

  it("returns undefined for $node.id when node not in cache", () => {
    const cache = new Map<string, EvalResult>();
    expect(resolveExpr("$node.missing-1", cache, EMPTY_BODY, undefined)).toBeUndefined();
  });

  it("returns undefined when path does not exist in value", () => {
    const cache = makeCache({ "n1": { a: 1 } });
    expect(resolveExpr("$node.n1.b.c", cache, EMPTY_BODY, undefined)).toBeUndefined();
  });

  it("returns undefined when intermediate path segment is null", () => {
    const cache = makeCache({ "n1": { a: null } });
    expect(resolveExpr("$node.n1.a.b", cache, EMPTY_BODY, undefined)).toBeUndefined();
  });

  it("returns undefined when intermediate path segment is a non-object primitive", () => {
    const cache = makeCache({ "n1": { a: 42 } });
    expect(resolveExpr("$node.n1.a.b", cache, EMPTY_BODY, undefined)).toBeUndefined();
  });

  it("resolves $json with primary input", () => {
    expect(resolveExpr("$json", new Map(), EMPTY_BODY, "hello")).toBe("hello");
  });

  it("resolves $json.field with path into primary input object", () => {
    const primary = { user: { name: "Bob" } };
    expect(resolveExpr("$json.user.name", new Map(), EMPTY_BODY, primary)).toBe("Bob");
  });

  it("resolves $json when primary input is undefined", () => {
    expect(resolveExpr("$json", new Map(), EMPTY_BODY, undefined)).toBeUndefined();
  });

  it("resolves $body", () => {
    const body = { message: "hi" };
    expect(resolveExpr("$body", new Map(), body, undefined)).toEqual({ message: "hi" });
  });

  it("resolves $body.field", () => {
    const body = { user: { email: "a@b.com" } };
    expect(resolveExpr("$body.user.email", new Map(), body, undefined)).toBe("a@b.com");
  });

  it("returns undefined for unknown expressions", () => {
    expect(resolveExpr("$foo.bar", new Map(), EMPTY_BODY, undefined)).toBeUndefined();
  });

  it("handles $node. with no id gracefully (returns undefined)", () => {
    expect(resolveExpr("$node.", new Map(), EMPTY_BODY, undefined)).toBeUndefined();
  });

  it("is trimmed — leading/trailing whitespace in expr", () => {
    const cache = makeCache({ "n1": "hello" });
    expect(resolveExpr("  $node.n1  ", cache, EMPTY_BODY, undefined)).toBe("hello");
  });

  it("resolves node value that is null", () => {
    const cache = makeCache({ "n1": null });
    expect(resolveExpr("$node.n1", cache, EMPTY_BODY, undefined)).toBeNull();
  });

  it("resolves node value that is false (boolean)", () => {
    const cache = makeCache({ "n1": false });
    expect(resolveExpr("$node.n1", cache, EMPTY_BODY, undefined)).toBe(false);
  });

  it("resolves node value that is 0 (number)", () => {
    const cache = makeCache({ "n1": 0 });
    expect(resolveExpr("$node.n1", cache, EMPTY_BODY, undefined)).toBe(0);
  });

  it("resolves node value that is an array", () => {
    const cache = makeCache({ "n1": [1, 2, 3] });
    expect(resolveExpr("$node.n1", cache, EMPTY_BODY, undefined)).toEqual([1, 2, 3]);
  });
});

// ─── resolveExpressions ───────────────────────────────────────────────────────

describe("resolveExpressions", () => {
  it("returns string unchanged when no {{ }}", () => {
    const result = resolveExpressions("hello world", new Map(), EMPTY_BODY, undefined);
    expect(result).toBe("hello world");
  });

  it("returns empty string unchanged", () => {
    expect(resolveExpressions("", new Map(), EMPTY_BODY, undefined)).toBe("");
  });

  it("pure expression returns raw value (object, not string)", () => {
    const cache = makeCache({ "n1": { a: 1 } });
    const result = resolveExpressions("{{ $node.n1 }}", cache, EMPTY_BODY, undefined);
    expect(result).toEqual({ a: 1 });
    expect(typeof result).toBe("object");
  });

  it("pure expression returns raw number", () => {
    const cache = makeCache({ "n1": 42 });
    const result = resolveExpressions("{{ $node.n1 }}", cache, EMPTY_BODY, undefined);
    expect(result).toBe(42);
  });

  it("pure expression with whitespace in braces", () => {
    const cache = makeCache({ "n1": "hi" });
    const result = resolveExpressions("{{  $node.n1  }}", cache, EMPTY_BODY, undefined);
    expect(result).toBe("hi");
  });

  it("mixed string interpolation produces a string", () => {
    const cache = makeCache({ "n1": "World" });
    const result = resolveExpressions("Hello {{ $node.n1 }}!", cache, EMPTY_BODY, undefined);
    expect(result).toBe("Hello World!");
  });

  it("mixed: object value is JSON-stringified", () => {
    const cache = makeCache({ "n1": { a: 1 } });
    const result = resolveExpressions("data: {{ $node.n1 }}", cache, EMPTY_BODY, undefined);
    expect(result).toBe('data: {"a":1}');
  });

  it("unresolvable block is kept verbatim in mixed string", () => {
    const result = resolveExpressions("prefix {{ $node.missing }} suffix", new Map(), EMPTY_BODY, undefined);
    expect(result).toBe("prefix {{ $node.missing }} suffix");
  });

  it("pure unresolvable block is kept verbatim", () => {
    const result = resolveExpressions("{{ $node.missing }}", new Map(), EMPTY_BODY, undefined);
    expect(result).toBe("{{ $node.missing }}");
  });

  it("multiple blocks in one string", () => {
    const cache = makeCache({ "a": "foo", "b": "bar" });
    const result = resolveExpressions("{{ $node.a }}-{{ $node.b }}", cache, EMPTY_BODY, undefined);
    expect(result).toBe("foo-bar");
  });

  it("null resolved value treated as verbatim in mixed string", () => {
    const cache = makeCache({ "n1": null });
    const result = resolveExpressions("val: {{ $node.n1 }}", cache, EMPTY_BODY, undefined);
    // null is treated as verbatim (undefined check)
    expect(result).toBe("val: {{ $node.n1 }}");
  });

  it("$body.field in mixed string", () => {
    const body = { name: "Alice" };
    const result = resolveExpressions("Hello {{ $body.name }}", new Map(), body, undefined);
    expect(result).toBe("Hello Alice");
  });

  it("$json.field in mixed string", () => {
    const result = resolveExpressions("User: {{ $json.user }}", new Map(), EMPTY_BODY, { user: "Charlie" });
    expect(result).toBe("User: Charlie");
  });

  it("does not modify string without {{ even if it has $node text", () => {
    const result = resolveExpressions("$node.text", new Map(), EMPTY_BODY, undefined);
    expect(result).toBe("$node.text");
  });
});

// ─── resolveNodeData ─────────────────────────────────────────────────────────

describe("resolveNodeData", () => {
  it("resolves string field at top level", () => {
    const cache = makeCache({ "n1": "world" });
    const data = { label: "Hello {{ $node.n1 }}" };
    const result = resolveNodeData(data, cache, EMPTY_BODY, undefined);
    expect(result.label).toBe("Hello world");
  });

  it("does not mutate original data", () => {
    const cache = makeCache({ "n1": "x" });
    const data = { field: "{{ $node.n1 }}" };
    resolveNodeData(data, cache, EMPTY_BODY, undefined);
    expect(data.field).toBe("{{ $node.n1 }}");
  });

  it("resolves expression in nested object", () => {
    const cache = makeCache({ "n1": "value" });
    const data = { outer: { inner: "{{ $node.n1 }}" } };
    const result = resolveNodeData(data, cache, EMPTY_BODY, undefined);
    expect((result.outer as Record<string, unknown>).inner).toBe("value");
  });

  it("resolves expression in array of objects", () => {
    const cache = makeCache({ "n1": "key" });
    const data = { headers: [{ key: "{{ $node.n1 }}", value: "val" }] };
    const result = resolveNodeData(data, cache, EMPTY_BODY, undefined);
    const headers = result.headers as Array<Record<string, unknown>>;
    expect(headers[0].key).toBe("key");
    expect(headers[0].value).toBe("val");
  });

  it("non-string fields pass through unchanged", () => {
    const cache = new Map<string, EvalResult>();
    const data = { count: 42, flag: true, obj: { x: 1 } };
    const result = resolveNodeData(data, cache, EMPTY_BODY, undefined);
    expect(result.count).toBe(42);
    expect(result.flag).toBe(true);
  });

  it("replaces entire field with raw object when pure expression", () => {
    const cache = makeCache({ "n1": { foo: "bar" } });
    const data = { payload: "{{ $node.n1 }}" };
    const result = resolveNodeData(data, cache, EMPTY_BODY, undefined);
    expect(result.payload).toEqual({ foo: "bar" });
  });
});

// ─── extractNodeRefs ─────────────────────────────────────────────────────────

describe("extractNodeRefs", () => {
  it("returns empty array when no node refs", () => {
    expect(extractNodeRefs({ field: "hello" })).toEqual([]);
  });

  it("extracts single ref from string field", () => {
    const refs = extractNodeRefs({ url: "{{ $node.http-1.body }}" });
    expect(refs).toEqual(["http-1"]);
  });

  it("deduplicates same ref appearing multiple times", () => {
    const refs = extractNodeRefs({ a: "{{ $node.x }}", b: "{{ $node.x }}" });
    expect(refs).toEqual(["x"]);
  });

  it("extracts multiple distinct refs", () => {
    const refs = extractNodeRefs({ a: "{{ $node.n1 }}", b: "{{ $node.n2 }}" });
    expect(refs).toContain("n1");
    expect(refs).toContain("n2");
    expect(refs).toHaveLength(2);
  });

  it("extracts refs from nested objects", () => {
    const data = { outer: { inner: "{{ $node.nested-node }}" } };
    expect(extractNodeRefs(data)).toEqual(["nested-node"]);
  });

  it("extracts refs from array elements", () => {
    const data = { headers: [{ value: "{{ $node.tok-1 }}" }] };
    expect(extractNodeRefs(data)).toEqual(["tok-1"]);
  });

  it("does not extract $body or $json refs", () => {
    expect(extractNodeRefs({ a: "{{ $body.x }}", b: "{{ $json.y }}" })).toEqual([]);
  });

  it("extracts ref with underscores and hyphens", () => {
    const refs = extractNodeRefs({ f: "{{ $node.my_node-123 }}" });
    expect(refs).toEqual(["my_node-123"]);
  });
});

// ─── containsExpressions ─────────────────────────────────────────────────────

describe("containsExpressions", () => {
  it("returns true for string containing {{", () => {
    expect(containsExpressions("{{ $node.x }}")).toBe(true);
  });

  it("returns false for string without {{", () => {
    expect(containsExpressions("hello world")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(containsExpressions("")).toBe(false);
  });
});
