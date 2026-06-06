import { useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { withDefaultNodes } from "@/lib/canvas-utils";
import type { ConnectionType } from "@/lib/workflow-types";

type CanvasEdge = Edge & { connectionType?: ConnectionType };

interface UseWorkflowHistoryParams {
  latestNodesRef: React.RefObject<Node[]>;
  latestEdgesRef: React.RefObject<CanvasEdge[]>;
  setNodes: (updater: (nds: Node[]) => Node[]) => void;
  setEdges: (updater: (eds: CanvasEdge[]) => CanvasEdge[]) => void;
}

export function useWorkflowHistory({
  latestNodesRef,
  latestEdgesRef,
  setNodes,
  setEdges,
}: UseWorkflowHistoryParams) {
  const historyRef      = useRef<Array<{ nodes: Node[]; edges: CanvasEdge[] }>>([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback((ns: Node[], es: CanvasEdge[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({ nodes: ns, edges: es });
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const deferPushHistory = useCallback(() => {
    setTimeout(() => pushHistory(latestNodesRef.current!, latestEdgesRef.current!), 0);
  }, [pushHistory, latestNodesRef, latestEdgesRef]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const snap = historyRef.current[historyIndexRef.current];
    setNodes(() => withDefaultNodes(snap.nodes));
    setEdges(() => snap.edges);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const snap = historyRef.current[historyIndexRef.current];
    setNodes(() => withDefaultNodes(snap.nodes));
    setEdges(() => snap.edges);
  }, [setNodes, setEdges]);

  return { historyRef, historyIndexRef, pushHistory, deferPushHistory, undo, redo };
}
