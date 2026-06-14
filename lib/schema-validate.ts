/**
 * A small, dependency-free JSON Schema validator (a pragmatic draft-07 subset).
 *
 * Implemented in plain TypeScript — no `ajv`/native deps — so it stays safe for
 * the npm-distributed package. Pure and synchronous: feed it a value and a
 * parsed schema, get back `{ valid, errors }` with JSON-path-tracked messages.
 *
 * Supported keywords: `type` (string/number/integer/boolean/object/array/null,
 * single or array), `enum`, `const`, `required`, `properties`,
 * `additionalProperties` (boolean or sub-schema), `items` (sub-schema applied to
 * every element), `minItems`/`maxItems`/`uniqueItems`, `minLength`/`maxLength`,
 * `pattern`, `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`,
 * `multipleOf`. Unknown keywords (e.g. `format`, `$schema`, `title`) are ignored.
 */

export type SchemaType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";

export interface JsonSchema {
  type?: SchemaType | SchemaType[];
  enum?: unknown[];
  const?: unknown;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}

export interface ValidationError {
  /** JSON-path to the offending value, e.g. `$.user.tags[2]`. */
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function typeOf(value: unknown): SchemaType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "number") return Number.isInteger(value) ? "integer" : "number";
  if (t === "boolean") return "boolean";
  if (t === "string") return "string";
  return "object";
}

function matchesType(value: unknown, type: SchemaType): boolean {
  switch (type) {
    case "null":    return value === null;
    case "array":   return Array.isArray(value);
    case "object":  return value !== null && typeof value === "object" && !Array.isArray(value);
    case "string":  return typeof value === "string";
    case "boolean": return typeof value === "boolean";
    case "integer": return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
    case "number":  return typeof value === "number" && Number.isFinite(value);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) =>
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

function validateNode(value: unknown, schema: JsonSchema, path: string, errors: ValidationError[]): void {
  // type
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push({ path, message: `expected type ${types.join(" | ")}, got ${typeOf(value)}` });
      return; // further keyword checks assume the right type; stop here for this node
    }
  }

  // const / enum
  if ("const" in schema && !deepEqual(value, schema.const)) {
    errors.push({ path, message: `must equal the constant ${JSON.stringify(schema.const)}` });
  }
  if (schema.enum !== undefined && !schema.enum.some((e) => deepEqual(value, e))) {
    errors.push({ path, message: `must be one of ${JSON.stringify(schema.enum)}` });
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({ path, message: `must have length >= ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({ path, message: `must have length <= ${schema.maxLength}` });
    }
    if (schema.pattern !== undefined) {
      let re: RegExp | null = null;
      try { re = new RegExp(schema.pattern); } catch { re = null; }
      if (re && !re.test(value)) {
        errors.push({ path, message: `must match pattern /${schema.pattern}/` });
      }
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ path, message: `must be >= ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ path, message: `must be <= ${schema.maximum}` });
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push({ path, message: `must be > ${schema.exclusiveMinimum}` });
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push({ path, message: `must be < ${schema.exclusiveMaximum}` });
    }
    if (schema.multipleOf !== undefined && schema.multipleOf > 0) {
      const q = value / schema.multipleOf;
      if (Math.abs(q - Math.round(q)) > 1e-9) {
        errors.push({ path, message: `must be a multiple of ${schema.multipleOf}` });
      }
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ path, message: `must have at least ${schema.minItems} items` });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({ path, message: `must have at most ${schema.maxItems} items` });
    }
    if (schema.uniqueItems === true) {
      const seen: unknown[] = [];
      for (const item of value) {
        if (seen.some((s) => deepEqual(s, item))) {
          errors.push({ path, message: `must have unique items` });
          break;
        }
        seen.push(item);
      }
    }
    if (schema.items !== undefined) {
      value.forEach((item, i) => validateNode(item, schema.items as JsonSchema, `${path}[${i}]`, errors));
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (schema.required !== undefined) {
      for (const key of schema.required) {
        if (!(key in obj)) errors.push({ path: `${path}.${key}`, message: `is required` });
      }
    }
    const props = schema.properties ?? {};
    for (const [key, subSchema] of Object.entries(props)) {
      if (key in obj) validateNode(obj[key], subSchema, `${path}.${key}`, errors);
    }
    if (schema.additionalProperties !== undefined && schema.additionalProperties !== true) {
      for (const key of Object.keys(obj)) {
        if (key in props) continue;
        if (schema.additionalProperties === false) {
          errors.push({ path: `${path}.${key}`, message: `is not an allowed property` });
        } else {
          validateNode(obj[key], schema.additionalProperties, `${path}.${key}`, errors);
        }
      }
    }
  }
}

/** Validate `value` against `schema`, collecting every error with its JSON path. */
export function validateValue(value: unknown, schema: JsonSchema): ValidationResult {
  const errors: ValidationError[] = [];
  validateNode(value, schema, "$", errors);
  return { valid: errors.length === 0, errors };
}

/**
 * Parse a JSON Schema from text. Throws a descriptive Error when the text is not
 * valid JSON or not a JSON object (so a node can surface it as a config error).
 */
export function parseSchema(text: string): JsonSchema {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`invalid JSON Schema: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("invalid JSON Schema: expected a JSON object");
  }
  return parsed as JsonSchema;
}

/** Render validation errors as a single human-readable line. */
export function formatErrors(errors: ValidationError[]): string {
  return errors.map((e) => `${e.path} ${e.message}`).join("; ");
}
