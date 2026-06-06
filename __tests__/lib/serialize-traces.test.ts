import { describe, it, expect } from "vitest";
import { serializeTraces } from "@/lib/serialize-traces";
import type { NodeTrace } from "@/lib/node-trace";

function trace(overrides: Partial<NodeTrace> = {}): NodeTrace {
  return {
    nodeId: "n1",
    nodeType: "text",
    inputSnapshot: "null",
    outputSnapshot: "null",
    durationMs: 0,
    ...overrides,
  };
}

describe("serializeTraces", () => {
  it("marks a disabled node with disabled: true", () => {
    const [row] = serializeTraces([trace({ disabled: true })]);
    expect(row.disabled).toBe(true);
    expect(row.inputSnapshot).toBe("null");
    expect(row.outputSnapshot).toBe("null");
    expect(row.durationMs).toBe(0);
  });

  it("defaults disabled to false when the field is absent", () => {
    const [row] = serializeTraces([trace()]);
    expect(row.disabled).toBe(false);
  });

  it("preserves the other trace fields", () => {
    const [row] = serializeTraces([
      trace({
        nodeId: "n2",
        nodeType: "if",
        inputSnapshot: '{"a":1}',
        outputSnapshot: '{"b":2}',
        durationMs: 12,
        error: "boom",
        rawValue: { b: 2 },
        pinned: true,
      }),
    ]);
    expect(row).toEqual({
      nodeId: "n2",
      nodeType: "if",
      inputSnapshot: '{"a":1}',
      outputSnapshot: '{"b":2}',
      durationMs: 12,
      error: "boom",
      rawValue: { b: 2 },
      pinned: true,
      disabled: false,
    });
  });

  it("maps a missing error to null and pinned to false", () => {
    const [row] = serializeTraces([trace()]);
    expect(row.error).toBeNull();
    expect(row.pinned).toBe(false);
  });
});
