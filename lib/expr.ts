import type { EvalResult } from "@/lib/workflow-types";

// ─── Regex ────────────────────────────────────────────────────────────────────

/** Matches {{ ... }} blocks. Content is captured in group 1. */
const EXPR_BLOCK_RE = /\{\{([\s\S]+?)\}\}/g;

/** Detects whether a string is ENTIRELY one expression (possibly with whitespace). Content must not contain braces. */
const PURE_EXPR_RE = /^\{\{\s*([^{}]+?)\s*\}\}$/;

// ─── Path helpers ─────────────────────────────────────────────────────────────

function drillPath(value: unknown, path: string[]): unknown {
  let cur = value;
  for (const key of path) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

// ─── Single expression resolver ───────────────────────────────────────────────

/**
 * Resolve a single expression string (the content inside {{ }}).
 * Returns `undefined` for unknown / unresolvable expressions.
 */
export function resolveExpr(
  expr: string,
  cache: Map<string, EvalResult>,
  body: Record<string, unknown>,
  primaryInput: unknown
): unknown {
  const trimmed = expr.trim();

  // $node.<id>  or  $node.<id>.<path>
  if (trimmed.startsWith("$node.")) {
    const rest = trimmed.slice(6);
    if (!rest) return undefined;
    const dotIdx = rest.indexOf(".");
    const nodeId = dotIdx === -1 ? rest : rest.slice(0, dotIdx);
    if (!nodeId) return undefined;
    const pathStr = dotIdx === -1 ? "" : rest.slice(dotIdx + 1);
    const cached = cache.get(`${nodeId}:`);
    if (cached === undefined) return undefined;
    if (!pathStr) return cached.value;
    return drillPath(cached.value, pathStr.split("."));
  }

  // $json  or  $json.<path>
  if (trimmed === "$json") return primaryInput;
  if (trimmed.startsWith("$json.")) {
    const pathStr = trimmed.slice(6);
    if (!pathStr) return primaryInput;
    return drillPath(primaryInput, pathStr.split("."));
  }

  // $body  or  $body.<path>
  if (trimmed === "$body") return body;
  if (trimmed.startsWith("$body.")) {
    const pathStr = trimmed.slice(6);
    if (!pathStr) return body;
    return drillPath(body, pathStr.split("."));
  }

  return undefined;
}

// ─── String interpolation ─────────────────────────────────────────────────────

/**
 * Resolve all {{ expr }} blocks in `text`.
 *
 * - If the entire string is a single {{ expr }}, returns the raw resolved value
 *   (may be non-string — object, array, number, etc.).
 * - For mixed strings ("prefix {{ expr }} suffix"), each block is stringified
 *   and spliced in. Unresolvable blocks are kept verbatim.
 */
export function resolveExpressions(
  text: string,
  cache: Map<string, EvalResult>,
  body: Record<string, unknown>,
  primaryInput: unknown
): unknown {
  if (!text.includes("{{")) return text;

  // Pure single-expression: return raw value
  const pureMatch = PURE_EXPR_RE.exec(text);
  if (pureMatch) {
    const val = resolveExpr(pureMatch[1], cache, body, primaryInput);
    return val !== undefined ? val : text;
  }

  // Mixed interpolation: substitute each block as a string
  EXPR_BLOCK_RE.lastIndex = 0;
  return text.replace(EXPR_BLOCK_RE, (match, inner: string) => {
    const val = resolveExpr(inner, cache, body, primaryInput);
    if (val === undefined || val === null) return match;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  });
}

// ─── Deep node-data resolver ──────────────────────────────────────────────────

/**
 * Recursively walk `data` and resolve expression strings in-place (returns a
 * new object — original is not mutated).
 */
export function resolveNodeData(
  data: Record<string, unknown>,
  cache: Map<string, EvalResult>,
  body: Record<string, unknown>,
  primaryInput: unknown
): Record<string, unknown> {
  function walk(val: unknown): unknown {
    if (typeof val === "string") {
      return resolveExpressions(val, cache, body, primaryInput);
    }
    if (Array.isArray(val)) return val.map(walk);
    if (val !== null && typeof val === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        out[k] = walk(v);
      }
      return out;
    }
    return val;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = walk(v);
  }
  return out;
}

// ─── Node-ref extraction ──────────────────────────────────────────────────────

/** Scan all string values in node.data and return unique $node.<id> references. */
export function extractNodeRefs(data: Record<string, unknown>): string[] {
  const seen = new Set<string>();
  const refs: string[] = [];
  const NODE_REF_RE = /\$node\.([A-Za-z0-9_-]+)/g;

  function scan(val: unknown) {
    if (typeof val === "string") {
      NODE_REF_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = NODE_REF_RE.exec(val)) !== null) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          refs.push(m[1]);
        }
        // Advance by 1 char to handle overlapping (shouldn't happen but safe)
      }
    } else if (Array.isArray(val)) {
      for (const item of val) scan(item);
    } else if (val !== null && typeof val === "object") {
      for (const v of Object.values(val as Record<string, unknown>)) scan(v);
    }
  }

  scan(data);
  return refs;
}

// ─── Quick check ─────────────────────────────────────────────────────────────

/** Returns true if the string contains at least one {{ }} block. */
export function containsExpressions(text: string): boolean {
  return text.includes("{{");
}
