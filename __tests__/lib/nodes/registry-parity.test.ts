import { describe, it, expect } from "vitest";
import { NODE_REGISTRY } from "@/components/canvas/nodes/registry";
import { NODE_EXECUTOR_REGISTRY } from "@/lib/nodes/registry";

// workflowOutput is handled at the engine level (it's the terminal node — never evaluated).
const CANVAS_ONLY = new Set(["workflowOutput"]);
// workflowInput is implicit (represents the incoming request body) — not a draggable canvas node.
const EXECUTOR_ONLY = new Set(["workflowInput"]);

describe("Registry parity", () => {
  const canvasTypes   = NODE_REGISTRY.map((n) => n.type).filter((t) => !CANVAS_ONLY.has(t));
  const executorTypes = Object.keys(NODE_EXECUTOR_REGISTRY).filter((t) => !EXECUTOR_ONLY.has(t));

  it("every canvas node type (except workflowOutput) has a matching executor", () => {
    const missing = canvasTypes.filter((t) => !(t in NODE_EXECUTOR_REGISTRY));
    expect(missing).toEqual([]);
  });

  it("every executor type (except workflowInput) has a matching canvas entry", () => {
    const canvasSet = new Set(NODE_REGISTRY.map((n) => n.type));
    const extra = executorTypes.filter((t) => !canvasSet.has(t));
    expect(extra).toEqual([]);
  });

  it("canvas and executor registries have the same count (accounting for known exceptions)", () => {
    expect(canvasTypes.length).toBe(executorTypes.length);
  });

  it("all executor values implement INodeExecutor", () => {
    for (const [type, versionMap] of Object.entries(NODE_EXECUTOR_REGISTRY)) {
      expect(
        typeof versionMap === "object" && versionMap !== null,
        `version map for "${type}" is not an object`
      ).toBe(true);
      for (const [version, executor] of Object.entries(versionMap)) {
        expect(
          typeof executor === "object" && executor !== null && typeof (executor as { execute?: unknown }).execute === "function",
          `executor for "${type}" v${version} does not implement INodeExecutor`
        ).toBe(true);
      }
    }
  });

  it("all canvas entries have a non-empty type string", () => {
    for (const def of NODE_REGISTRY) {
      expect(def.type.length, `NodeDef with empty type found`).toBeGreaterThan(0);
    }
  });
});
