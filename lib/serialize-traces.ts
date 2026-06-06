import type { NodeTrace } from "@/lib/node-trace";

/**
 * Shapes the internal {@link NodeTrace} array into the JSON form returned by the
 * debug route. Keep every field the Logs/Debug UI relies on — including
 * `disabled`, which marks a node that was bypassed (input passed through
 * unchanged) so the trace row can render it distinctly.
 */
export function serializeTraces(traces: NodeTrace[]) {
  return traces.map((t) => ({
    nodeId: t.nodeId,
    nodeType: t.nodeType,
    inputSnapshot: t.inputSnapshot,
    outputSnapshot: t.outputSnapshot,
    durationMs: t.durationMs,
    error: t.error ?? null,
    rawValue: t.rawValue,
    pinned: t.pinned ?? false,
    disabled: t.disabled ?? false,
  }));
}
