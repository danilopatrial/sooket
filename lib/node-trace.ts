export const MAX_SNAPSHOT_BYTES = 4096;

export interface NodeTrace {
  nodeId: string;
  nodeType: string;
  inputSnapshot: string;
  outputSnapshot: string;
  durationMs: number;
  error?: string;
  /** Raw output value (result.value) for use by the pin feature — not truncated. */
  rawValue?: unknown;
  /** True when the node was skipped because its output was pinned. */
  pinned?: boolean;
  /** True when the node is disabled — it was bypassed and its input passed through unchanged. */
  disabled?: boolean;
}

/**
 * Serializes `value` to JSON and truncates if it exceeds `maxBytes` code units.
 * Uses string length as a byte proxy (accurate for ASCII, approximate for Unicode).
 */
export function truncatePayload(value: unknown, maxBytes = MAX_SNAPSHOT_BYTES): string {
  let str: string;
  try {
    str = JSON.stringify(value) ?? "null";
  } catch {
    str = String(value);
  }
  if (str.length <= maxBytes) return str;
  const SUFFIX = "…[truncated]";
  return str.slice(0, maxBytes - SUFFIX.length) + SUFFIX;
}
