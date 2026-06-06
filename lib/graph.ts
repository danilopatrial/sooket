import type { WorkflowEdge } from "@/lib/workflow-types";

/**
 * Returns the set of all ancestor node IDs for the given node.
 * Traverses the edge graph backwards (following target→source) using BFS.
 * The returned set never includes nodeId itself.
 */
export function findAncestors(nodeId: string, edges: WorkflowEdge[]): Set<string> {
  // Build reverse map: targetId → Set<sourceId>
  const parentMap = new Map<string, Set<string>>();
  for (const edge of edges) {
    let parents = parentMap.get(edge.target);
    if (!parents) {
      parents = new Set<string>();
      parentMap.set(edge.target, parents);
    }
    parents.add(edge.source);
  }

  const ancestors = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const parents = parentMap.get(current);
    if (!parents) continue;
    for (const parent of parents) {
      if (!ancestors.has(parent)) {
        ancestors.add(parent);
        queue.push(parent);
      }
    }
  }

  return ancestors;
}
