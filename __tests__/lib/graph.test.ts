import { describe, it, expect } from "vitest";
import { findAncestors } from "@/lib/graph";
import type { WorkflowEdge } from "@/lib/workflow-types";

function edge(source: string, target: string): WorkflowEdge {
  return { id: `${source}->${target}`, source, target };
}

describe("findAncestors", () => {
  it("returns empty set when node has no ancestors", () => {
    const edges: WorkflowEdge[] = [edge("A", "B"), edge("B", "C")];
    expect(findAncestors("A", edges)).toEqual(new Set());
  });

  it("returns empty set for a node not referenced in any edge", () => {
    const edges: WorkflowEdge[] = [edge("A", "B")];
    expect(findAncestors("Z", edges)).toEqual(new Set());
  });

  it("returns empty set when edge list is empty", () => {
    expect(findAncestors("A", [])).toEqual(new Set());
  });

  it("returns direct parent for a node with one incoming edge", () => {
    const edges: WorkflowEdge[] = [edge("A", "B")];
    expect(findAncestors("B", edges)).toEqual(new Set(["A"]));
  });

  it("returns all ancestors in a multi-hop chain A→B→C", () => {
    const edges: WorkflowEdge[] = [edge("A", "B"), edge("B", "C")];
    const result = findAncestors("C", edges);
    expect(result).toEqual(new Set(["A", "B"]));
  });

  it("multi-hop chain of length 4: A→B→C→D", () => {
    const edges: WorkflowEdge[] = [edge("A", "B"), edge("B", "C"), edge("C", "D")];
    expect(findAncestors("D", edges)).toEqual(new Set(["A", "B", "C"]));
  });

  it("diamond dependency: A appears only once", () => {
    // A→B, A→C, B→D, C→D
    const edges: WorkflowEdge[] = [
      edge("A", "B"),
      edge("A", "C"),
      edge("B", "D"),
      edge("C", "D"),
    ];
    const result = findAncestors("D", edges);
    expect(result).toEqual(new Set(["A", "B", "C"]));
    // Explicitly verify A is not duplicated (set size must be 3)
    expect(result.size).toBe(3);
  });

  it("does not include the node itself in the ancestor set", () => {
    const edges: WorkflowEdge[] = [edge("A", "B"), edge("B", "C")];
    const result = findAncestors("C", edges);
    expect(result.has("C")).toBe(false);
  });

  it("multiple parents, no further ancestors", () => {
    // B→D and C→D, B and C have no parents
    const edges: WorkflowEdge[] = [edge("B", "D"), edge("C", "D")];
    expect(findAncestors("D", edges)).toEqual(new Set(["B", "C"]));
  });

  it("unrelated edges are ignored", () => {
    // X→Y is unrelated to A→B→C
    const edges: WorkflowEdge[] = [edge("A", "B"), edge("B", "C"), edge("X", "Y")];
    expect(findAncestors("C", edges)).toEqual(new Set(["A", "B"]));
  });
});
