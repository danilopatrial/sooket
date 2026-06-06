import type { Node, Edge } from "@xyflow/react";
import type { NodeDef } from "@/components/canvas/nodes/registry";

// Grid snaps to these flow-coordinate values so visual density
// stays ~32 px on screen at every zoom level.
export const GRID_STEPS = [16, 32, 64, 128, 256, 512];

// Padding around the node bounding box (flow coords) for edge-insertion detection.
export const EDGE_SPLIT_PADDING = 20;

export function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Minimum distance from line segment [a,b] to an axis-aligned rect.
 * Returns 0 when the segment passes through (or inside) the rect.
 * Uses Liang-Barsky clipping + corner distances as fallback.
 */
export function segmentToRectDist(
  a: { x: number; y: number },
  b: { x: number; y: number },
  left: number, top: number, right: number, bottom: number,
): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  let tMin = 0, tMax = 1;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-10) return q >= 0;
    const r = q / p;
    if (p < 0) tMin = Math.max(tMin, r);
    else       tMax = Math.min(tMax, r);
    return tMin <= tMax;
  };
  const inside =
    clip(-dx, a.x - left)  &&
    clip( dx, right - a.x) &&
    clip(-dy, a.y - top)   &&
    clip( dy, bottom - a.y);
  if (inside) return 0;

  const ptToRect = (p: { x: number; y: number }) =>
    Math.hypot(
      Math.max(left - p.x, 0, p.x - right),
      Math.max(top  - p.y, 0, p.y - bottom),
    );
  const corners = [
    { x: left, y: top }, { x: right, y: top },
    { x: left, y: bottom }, { x: right, y: bottom },
  ];
  return Math.min(
    ptToRect(a), ptToRect(b),
    ...corners.map((c) => distanceToSegment(c, a, b)),
  );
}

export function resolveOutput(node: Node, def: NodeDef | undefined): string | null {
  if (!def) return null;
  if (def.getDynamicOutput) return def.getDynamicOutput(node.data as Record<string, unknown>);
  return def.primaryOutput ?? null;
}

export function findEdgeUnderNode(
  node: Node,
  edges: Edge[],
  nodes: Node[],
  def: NodeDef | undefined,
): Edge | null {
  if (!def || def.primaryInput == null || resolveOutput(node, def) == null) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = (node.measured as any)?.width  ?? 224;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = (node.measured as any)?.height ?? 120;

  for (const edge of edges) {
    if (edge.source === node.id || edge.target === node.id) continue;
    const src = nodes.find((n) => n.id === edge.source);
    const tgt = nodes.find((n) => n.id === edge.target);
    if (!src || !tgt) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srcW = (src.measured as any)?.width  ?? 224;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srcH = (src.measured as any)?.height ?? 120;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tgtH = (tgt.measured as any)?.height ?? 120;
    const srcPt = { x: src.position.x + srcW, y: src.position.y + srcH / 2 };
    const tgtPt = { x: tgt.position.x,         y: tgt.position.y + tgtH / 2 };

    const dist = segmentToRectDist(
      srcPt, tgtPt,
      node.position.x - EDGE_SPLIT_PADDING,
      node.position.y - EDGE_SPLIT_PADDING,
      node.position.x + w + EDGE_SPLIT_PADDING,
      node.position.y + h + EDGE_SPLIT_PADDING,
    );
    if (dist === 0) return edge;
  }
  return null;
}

const INPUT_ID = "__input";

export function withDefaultNodes(nodes: Node[]): Node[] {
  const hasInput  = nodes.some(n => n.type === "workflowInput");
  const hasOutput = nodes.some(n => n.type === "workflowOutput");
  const result = nodes.map(n =>
    n.type === "workflowInput" ? { ...n, deletable: false } : n
  );
  if (!hasInput) {
    result.unshift({
      id: INPUT_ID,
      type: "workflowInput",
      typeVersion: 1,
      position: { x: 60, y: 180 },
      data: {},
      deletable: false,
    } as Node);
  }
  if (!hasOutput) {
    result.push({
      id: "__output",
      type: "workflowOutput",
      typeVersion: 1,
      position: { x: 620, y: 180 },
      data: {},
    } as Node);
  }
  return result;
}
