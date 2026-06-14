/**
 * JSON Schema (draft-07 subset) validator: type/enum/const, object
 * required/properties/additionalProperties, array items/min/max/unique, string
 * length/pattern, and numeric bounds/multipleOf — with JSON-path error tracking.
 */
import { describe, it, expect } from "vitest";
import {
  validateValue,
  parseSchema,
  formatErrors,
  type JsonSchema,
} from "@/lib/schema-validate";

describe("type checking", () => {
  it("accepts matching primitive types", () => {
    expect(validateValue("hi", { type: "string" }).valid).toBe(true);
    expect(validateValue(3, { type: "number" }).valid).toBe(true);
    expect(validateValue(3, { type: "integer" }).valid).toBe(true);
    expect(validateValue(true, { type: "boolean" }).valid).toBe(true);
    expect(validateValue(null, { type: "null" }).valid).toBe(true);
    expect(validateValue([], { type: "array" }).valid).toBe(true);
    expect(validateValue({}, { type: "object" }).valid).toBe(true);
  });

  it("rejects mismatched types with a path + message", () => {
    const r = validateValue(3, { type: "string" });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toEqual({ path: "$", message: "expected type string, got integer" });
  });

  it("treats integers distinctly from non-integer numbers", () => {
    expect(validateValue(3.5, { type: "integer" }).valid).toBe(false);
    expect(validateValue(3.5, { type: "number" }).valid).toBe(true);
  });

  it("does not treat arrays or null as object", () => {
    expect(validateValue([], { type: "object" }).valid).toBe(false);
    expect(validateValue(null, { type: "object" }).valid).toBe(false);
  });

  it("accepts a union of types", () => {
    const schema: JsonSchema = { type: ["string", "null"] };
    expect(validateValue("x", schema).valid).toBe(true);
    expect(validateValue(null, schema).valid).toBe(true);
    expect(validateValue(1, schema).valid).toBe(false);
  });
});

describe("enum and const", () => {
  it("enforces enum membership (deep)", () => {
    expect(validateValue("b", { enum: ["a", "b"] }).valid).toBe(true);
    expect(validateValue("c", { enum: ["a", "b"] }).valid).toBe(false);
    expect(validateValue({ x: 1 }, { enum: [{ x: 1 }] }).valid).toBe(true);
  });

  it("enforces const (deep)", () => {
    expect(validateValue(42, { const: 42 }).valid).toBe(true);
    expect(validateValue(43, { const: 42 }).valid).toBe(false);
    expect(validateValue([1, 2], { const: [1, 2] }).valid).toBe(true);
  });
});

describe("string constraints", () => {
  it("checks minLength/maxLength/pattern", () => {
    expect(validateValue("ab", { type: "string", minLength: 3 }).valid).toBe(false);
    expect(validateValue("abcd", { type: "string", maxLength: 3 }).valid).toBe(false);
    expect(validateValue("a@b.com", { type: "string", pattern: "^[^@]+@[^@]+$" }).valid).toBe(true);
    expect(validateValue("nope", { type: "string", pattern: "^[^@]+@[^@]+$" }).valid).toBe(false);
  });

  it("ignores a malformed pattern rather than throwing", () => {
    expect(validateValue("x", { type: "string", pattern: "(" }).valid).toBe(true);
  });
});

describe("number constraints", () => {
  it("checks minimum/maximum/exclusive bounds", () => {
    expect(validateValue(5, { type: "number", minimum: 5 }).valid).toBe(true);
    expect(validateValue(4, { type: "number", minimum: 5 }).valid).toBe(false);
    expect(validateValue(5, { type: "number", exclusiveMinimum: 5 }).valid).toBe(false);
    expect(validateValue(10, { type: "number", maximum: 10 }).valid).toBe(true);
    expect(validateValue(10, { type: "number", exclusiveMaximum: 10 }).valid).toBe(false);
  });

  it("checks multipleOf with float tolerance", () => {
    expect(validateValue(9, { type: "number", multipleOf: 3 }).valid).toBe(true);
    expect(validateValue(10, { type: "number", multipleOf: 3 }).valid).toBe(false);
    expect(validateValue(0.3, { type: "number", multipleOf: 0.1 }).valid).toBe(true);
  });
});

describe("array constraints", () => {
  it("validates items, length, and uniqueness", () => {
    const schema: JsonSchema = { type: "array", items: { type: "integer" }, minItems: 1, maxItems: 3, uniqueItems: true };
    expect(validateValue([1, 2], schema).valid).toBe(true);
    expect(validateValue([], schema).valid).toBe(false);
    expect(validateValue([1, 2, 3, 4], schema).valid).toBe(false);
    expect(validateValue([1, 1], schema).valid).toBe(false);
    expect(validateValue([1, "x"], schema).valid).toBe(false);
  });

  it("reports the element path for a bad item", () => {
    const r = validateValue([1, "x"], { type: "array", items: { type: "integer" } });
    expect(r.errors[0].path).toBe("$[1]");
  });
});

describe("object constraints", () => {
  const schema: JsonSchema = {
    type: "object",
    required: ["name", "age"],
    properties: {
      name: { type: "string", minLength: 1 },
      age: { type: "integer", minimum: 0 },
      tags: { type: "array", items: { type: "string" } },
    },
    additionalProperties: false,
  };

  it("accepts a conforming object", () => {
    expect(validateValue({ name: "Ada", age: 36, tags: ["x"] }, schema).valid).toBe(true);
  });

  it("flags a missing required property with its path", () => {
    const r = validateValue({ name: "Ada" }, schema);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual({ path: "$.age", message: "is required" });
  });

  it("flags a nested property violation with a nested path", () => {
    const r = validateValue({ name: "Ada", age: 36, tags: ["ok", 5] }, schema);
    expect(r.valid).toBe(false);
    expect(r.errors[0].path).toBe("$.tags[1]");
  });

  it("rejects additional properties when additionalProperties is false", () => {
    const r = validateValue({ name: "Ada", age: 1, extra: true }, schema);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual({ path: "$.extra", message: "is not an allowed property" });
  });

  it("validates additional properties against a sub-schema", () => {
    const s: JsonSchema = { type: "object", additionalProperties: { type: "number" } };
    expect(validateValue({ a: 1, b: 2 }, s).valid).toBe(true);
    expect(validateValue({ a: 1, b: "x" }, s).valid).toBe(false);
  });

  it("collects multiple errors at once", () => {
    const r = validateValue({ age: -1 }, schema);
    // missing name (required) + age below minimum
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseSchema", () => {
  it("parses a valid object schema", () => {
    expect(parseSchema('{"type":"string"}')).toEqual({ type: "string" });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseSchema("{not json")).toThrow(/invalid JSON Schema/);
  });

  it("throws when the JSON is not an object", () => {
    expect(() => parseSchema("[1,2]")).toThrow(/expected a JSON object/);
    expect(() => parseSchema("42")).toThrow(/expected a JSON object/);
  });
});

describe("formatErrors", () => {
  it("renders errors as a single line", () => {
    const out = formatErrors([
      { path: "$.age", message: "is required" },
      { path: "$.name", message: "expected type string, got integer" },
    ]);
    expect(out).toBe("$.age is required; $.name expected type string, got integer");
  });
});
