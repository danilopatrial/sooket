import { useCallback, useRef } from "react";
import { toast } from "sonner";
import type { Node, Edge } from "@xyflow/react";
import { NODE_REGISTRY } from "@/components/canvas/nodes/registry";
import type { ConnectionType } from "@/lib/workflow-types";

type CanvasEdge = Edge & { connectionType?: ConnectionType };

interface UseWorkflowClipboardParams {
  latestNodesRef: React.RefObject<Node[]>;
  latestEdgesRef: React.RefObject<CanvasEdge[]>;
  mouseScreenPos: React.RefObject<{ x: number; y: number }>;
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
  setNodes: (updater: (nds: Node[]) => Node[]) => void;
  setEdges: (updater: (eds: CanvasEdge[]) => CanvasEdge[]) => void;
  deferPushHistory: () => void;
}

export function useWorkflowClipboard({
  latestNodesRef,
  latestEdgesRef,
  mouseScreenPos,
  screenToFlowPosition,
  setNodes,
  setEdges,
  deferPushHistory,
}: UseWorkflowClipboardParams) {
  const clipboardRef = useRef<{ nodes: Node[]; edges: CanvasEdge[] } | null>(null);

  const handleCopy = useCallback(() => {
    const selected = latestNodesRef.current!.filter(
      (n) => n.selected && n.type !== "workflowInput"
    );
    if (!selected.length) return;
    const selectedIds = new Set(selected.map((n) => n.id));
    clipboardRef.current = {
      nodes: selected,
      edges: latestEdgesRef.current!.filter(
        (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
      ),
    };
  }, [latestNodesRef, latestEdgesRef]);

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
  }, [setNodes]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current?.nodes.length) return;
    const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current;

    const cx = copiedNodes.reduce((s, n) => s + n.position.x, 0) / copiedNodes.length;
    const cy = copiedNodes.reduce((s, n) => s + n.position.y, 0) / copiedNodes.length;
    // Fall back to the viewport centre when the mouse hasn't entered the canvas yet.
    const mouse = mouseScreenPos.current!;
    const screenTarget = (mouse.x === 0 && mouse.y === 0)
      ? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      : mouse;
    const target = screenToFlowPosition(screenTarget);

    const idMap = new Map<string, string>();
    const newNodes: Node[] = [];

    for (const n of copiedNodes) {
      const def = NODE_REGISTRY.find((d) => d.type === n.type);
      if (def?.singleton && latestNodesRef.current!.some((x) => x.type === n.type)) {
        toast.info(`Only one ${def.label} node allowed per workflow`);
        continue;
      }
      const newId = `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(n.id, newId);
      newNodes.push({
        ...n,
        id: newId,
        position: { x: target.x + (n.position.x - cx), y: target.y + (n.position.y - cy) },
        selected: true,
        data: { ...n.data },
      });
    }

    if (!newNodes.length) return;

    const newEdges: CanvasEdge[] = copiedEdges
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((e) => ({
        ...e,
        id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
      }));

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    deferPushHistory();
  }, [screenToFlowPosition, mouseScreenPos, setNodes, setEdges, deferPushHistory, latestNodesRef]);

  return { clipboardRef, handleCopy, selectAll, handlePaste };
}
