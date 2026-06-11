import { decrypt } from "@/lib/crypto";

export function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Supports dot-notation paths: "body.message" → data.body.message
export function resolvePath(data: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".");
  let cur: unknown = data;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function resolveVars(text: string, vars: Map<string, string>): string {
  if (!text.includes("$") || vars.size === 0) return text;
  return text.replace(/\$([A-Z][A-Z0-9_]*)/g, (_, name: string) => vars.get(name) ?? `$${name}`);
}

export async function decryptValue(ciphertextHex: string, secret: string): Promise<string> {
  // Delegate to the single decrypt implementation in lib/crypto.ts so the
  // encrypt and decrypt paths can never drift apart (same salt, iterations,
  // hash) and this path inherits the memoised key + legacy-iteration fallback.
  return decrypt(ciphertextHex, secret);
}

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) => {
    if (cur !== null && cur !== undefined && typeof cur === "object" && !Array.isArray(cur)) {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
