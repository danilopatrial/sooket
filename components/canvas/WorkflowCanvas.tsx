"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VariablesContext } from "@/lib/variables-context";
import { NodesContext } from "@/lib/nodes-context";
import type { ConnectionType, EvalResult } from "@/lib/workflow-types";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";

type CanvasEdge = Edge & { connectionType?: ConnectionType };
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { Pin, PinOff, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DebugPanel } from "./DebugPanel";
import { HistoryPanel } from "./HistoryPanel";
import { NODE_TYPES, NODE_DEFAULTS, NODE_REGISTRY } from "./nodes/registry";
import type { NodeDef } from "./nodes/registry";
import { InputNode } from "./nodes/InputNode";
import { NodeSidebar } from "./NodeSidebar";
import { NodeSearchMenu } from "./NodeSearchMenu";
import { AdaptiveBackground } from "./AdaptiveBackground";
import { CanvasTopBar } from "./CanvasTopBar";
import { CanvasStatusBar } from "./CanvasStatusBar";
import { useWorkflowHistory } from "./hooks/useWorkflowHistory";
import { useWorkflowClipboard } from "./hooks/useWorkflowClipboard";
import { withDefaultNodes, findEdgeUnderNode, resolveOutput } from "@/lib/canvas-utils";

const ALL_NODE_TYPES = {
  ...NODE_TYPES,
  workflowInput: InputNode,
};

const INPUT_ID = "__input";

interface WorkflowCanvasProps {
  slug: string;
  initialName: string;
  initialNodes: Node[];
  initialEdges: CanvasEdge[];
  initialActive: boolean;
  initialPinData?: Record<string, EvalResult>;
}

function WorkflowCanvasInner({
  slug,
  initialName,
  initialNodes,
  initialEdges,
  initialActive,
  initialPinData,
}: WorkflowCanvasProps) {
  const { screenToFlowPosition, fitView, getViewport, setViewport } = useReactFlow();

  function zoomBy(factor: number) {
    const { x, y, zoom } = getViewport();
    setViewport(
      { x, y, zoom: Math.min(3, Math.max(0.08, zoom * factor)) },
      { duration: 180 }
    );
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(withDefaultNodes(initialNodes));
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(initialEdges);
  const [name, setName] = useState(initialName);
  const [isActive, setIsActive] = useState(initialActive);
  const [variableNames, setVariableNames] = useState<string[]>([]);

  const refreshVariables = useCallback(() => {
    fetch(`/api/workflows/${slug}/variables`)
      .then((r) => r.json())
      .then((rows: Array<{ name: string }>) =>
        setVariableNames(rows.map((r) => r.name))
      )
      .catch(() => {});
  }, [slug]);

  useEffect(() => { refreshVariables(); }, [refreshVariables]);

  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [pinData, setPinData] = useState<Record<string, EvalResult>>(initialPinData ?? {});
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const mouseOverCanvas = useRef(false);
  const mouseScreenPos = useRef({ x: 0, y: 0 });

  const [searchMenu, setSearchMenu] = useState<{
    screenPos: { x: number; y: number };
    flowPos: { x: number; y: number };
  } | null>(null);

  const [edgeMenu, setEdgeMenu] = useState<{
    edgeId: string;
    x: number;
    y: number;
    currentType: ConnectionType | undefined;
  } | null>(null);

  const [nodeMenu, setNodeMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  const rerunTriggerRef = useRef<((nodeId: string) => void) | null>(null);

  // Always-current refs so callbacks with empty deps can read latest state.
  const latestNodesRef = useRef(nodes);
  const latestEdgesRef = useRef(edges);
  // eslint-disable-next-line react-hooks/refs
  latestNodesRef.current = nodes;
  // eslint-disable-next-line react-hooks/refs
  latestEdgesRef.current = edges;

  // Debounce timer for node-data changes
  const dataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── History ─────────────────────────────────────────────────────────────────
  const { pushHistory, deferPushHistory, undo, redo } = useWorkflowHistory({
    latestNodesRef,
    latestEdgesRef,
    setNodes: (updater) => setNodes(updater),
    setEdges: (updater) => setEdges(updater),
  });

  // Seed history with initial snapshot
  useEffect(() => {
    pushHistory(nodes, edges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Clipboard ────────────────────────────────────────────────────────────────
  const { handleCopy, selectAll, handlePaste } = useWorkflowClipboard({
    latestNodesRef,
    latestEdgesRef,
    mouseScreenPos,
    screenToFlowPosition,
    setNodes: (updater) => setNodes(updater),
    setEdges: (updater) => setEdges(updater),
    deferPushHistory,
  });

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  function checkOverTrash(event: MouseEvent | TouchEvent) {
    if (!trashRef.current) return false;
    const point = "clientX" in event ? event : event.changedTouches[0] ?? event.touches[0];
    if (!point) return false;
    const r = trashRef.current.getBoundingClientRect();
    return (
      point.clientX >= r.left &&
      point.clientX <= r.right &&
      point.clientY >= r.top &&
      point.clientY <= r.bottom
    );
  }

  const onNodeDragStart = useCallback((_: MouseEvent | TouchEvent, node: Node) => {
    if (node.type === "workflowInput") return;
    setIsDraggingNode(true);
  }, []);

  const onNodeDrag = useCallback((event: MouseEvent | TouchEvent, node: Node) => {
    if (node.type === "workflowInput") return;
    setIsOverTrash(checkOverTrash(event));
    const def = NODE_REGISTRY.find((r) => r.type === node.type);
    const edge = findEdgeUnderNode(node, latestEdgesRef.current, latestNodesRef.current, def);
    setHoveredEdgeId(edge?.id ?? null);
  }, []);

  const onNodeDragStop = useCallback((event: MouseEvent | TouchEvent, node: Node) => {
    setIsDraggingNode(false);
    setIsOverTrash(false);
    setHoveredEdgeId(null);

    if (node.type !== "workflowInput" && checkOverTrash(event)) {
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
      setEdges((eds) => eds.filter(
        (e) => e.source !== node.id && e.target !== node.id
      ));
      deferPushHistory();
      return;
    }

    const def = NODE_REGISTRY.find((r) => r.type === node.type);
    const edge = findEdgeUnderNode(node, latestEdgesRef.current, latestNodesRef.current, def);
    const primaryOutput = resolveOutput(node, def);
    if (edge && def && def.primaryInput != null && primaryOutput != null) {
      const ts = Date.now();
      setEdges((eds) => [
        ...eds.filter((e) => e.id !== edge.id),
        {
          id: `e-split-${ts}-in`,
          source: edge.source,
          sourceHandle: edge.sourceHandle ?? undefined,
          target: node.id,
          targetHandle: def.primaryInput!,
        },
        {
          id: `e-split-${ts}-out`,
          source: node.id,
          sourceHandle: primaryOutput,
          target: edge.target,
          targetHandle: edge.targetHandle ?? null,
        },
      ]);
    }

    deferPushHistory();
  }, [setNodes, setEdges, deferPushHistory]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      deferPushHistory();
    },
    [setEdges, deferPushHistory]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const ce = edge as CanvasEdge;
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      const x = event.clientX - (rect?.left ?? 0);
      const y = event.clientY - (rect?.top ?? 0);
      setEdgeMenu({ edgeId: ce.id, x, y, currentType: ce.connectionType });
    },
    []
  );

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl) {
        if (typing) return;
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (e.key === "z" &&  e.shiftKey) { e.preventDefault(); redo(); return; }
        if (e.key === "y")                { e.preventDefault(); redo(); return; }
        if (e.key === "a")                { e.preventDefault(); selectAll(); return; }
        if (e.key === "c")                { handleCopy(); return; }
        if (e.key === "v")                { e.preventDefault(); handlePaste(); return; }
        return;
      }
      if (!mouseOverCanvas.current) return;
      if (e.key !== "s" && e.key !== "S") return;
      if (typing) return;
      e.preventDefault();
      const flowPos = screenToFlowPosition(mouseScreenPos.current);
      setSearchMenu({ screenPos: { ...mouseScreenPos.current }, flowPos });
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screenToFlowPosition, undo, redo, selectAll, handleCopy, handlePaste]);

  // Context menu dismiss handlers
  useEffect(() => {
    if (!edgeMenu) return;
    function dismiss(e: KeyboardEvent | MouseEvent) {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      setEdgeMenu(null);
    }
    window.addEventListener("keydown", dismiss);
    window.addEventListener("mousedown", dismiss);
    return () => {
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("mousedown", dismiss);
    };
  }, [edgeMenu]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault();
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      const x = event.clientX - (rect?.left ?? 0);
      const y = event.clientY - (rect?.top ?? 0);
      setNodeMenu({ nodeId: node.id, x, y });
    },
    []
  );

  useEffect(() => {
    if (!nodeMenu) return;
    function dismiss(e: KeyboardEvent | MouseEvent) {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      setNodeMenu(null);
    }
    window.addEventListener("keydown", dismiss);
    window.addEventListener("mousedown", dismiss);
    return () => {
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("mousedown", dismiss);
    };
  }, [nodeMenu]);

  // ── Node / edge change handlers ─────────────────────────────────────────────
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      const filtered = changes.filter(
        (c) => !(c.type === "remove" && c.id === INPUT_ID)
      );
      onNodesChange(filtered);
      if (filtered.some((c) => c.type === "remove")) deferPushHistory();
    },
    [onNodesChange, deferPushHistory]
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChangeBase>[0]) => {
      onEdgesChangeBase(changes);
      if (changes.some((c) => c.type === "remove")) deferPushHistory();
    },
    [onEdgesChangeBase, deferPushHistory]
  );

  const updateNodeData = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      );
      if (dataTimerRef.current) clearTimeout(dataTimerRef.current);
      dataTimerRef.current = setTimeout(
        () => pushHistory(latestNodesRef.current, latestEdgesRef.current),
        800
      );
    },
    [setNodes, pushHistory]
  );

  // ── Context-menu derived state ──────────────────────────────────────────────
  const menuNodeData = nodeMenu ? nodes.find((n) => n.id === nodeMenu.nodeId) : null;
  const isMenuNodeDisabled = !!(menuNodeData as { disabled?: boolean } | null)?.disabled;
  const isMenuNodePinned = nodeMenu ? !!pinData[nodeMenu.nodeId] : false;
  const menuNodeHasPinnedResult = nodeMenu ? pinData[nodeMenu.nodeId] !== undefined : false;

  // ── Styled edges ─────────────────────────────────────────────────────────────
  const styledEdges = edges.map((e) => {
    const isError = (e as CanvasEdge).connectionType === "error";
    const base = isError
      ? { ...e, style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "5 4" }, animated: false }
      : e;
    return e.id === hoveredEdgeId
      ? { ...base, style: { stroke: "#f97316", strokeWidth: 3, strokeDasharray: "6 3" } }
      : base;
  });

  // ── nodesWithCallbacks ────────────────────────────────────────────────────────
  const nodesWithCallbacks = nodes.map((n) => {
    const connectedHandles = edges
      .filter((e) => e.target === n.id && e.targetHandle)
      .map((e) => e.targetHandle as string);

    const isHighlighted = highlightedNodeId === n.id;
    const isPinned = !!pinData[n.id];
    const isDisabledNode = !!(n as unknown as { disabled?: boolean }).disabled;

    return {
      ...n,
      style: isHighlighted
        ? { ...((n.style as Record<string, unknown>) ?? {}), boxShadow: "0 0 0 2px #7c3aed", borderRadius: 18 }
        : isPinned
          ? { ...((n.style as Record<string, unknown>) ?? {}), boxShadow: "0 0 0 2px #f59e0b", borderRadius: 18 }
          : isDisabledNode
            ? { ...((n.style as Record<string, unknown>) ?? {}), opacity: 0.4, borderRadius: 18 }
            : n.style,
      data: {
        ...n.data,
        connectedHandles,
        onChange: (p: Record<string, unknown>) => updateNodeData(n.id, p),
        onRemoveField: (fieldId: string) => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id !== n.id) return node;
              const fields = (node.data.fields as { id: string }[] | undefined) ?? [];
              return { ...node, data: { ...node.data, fields: fields.filter((f) => f.id !== fieldId) } };
            })
          );
          setEdges((eds) => eds.filter((e) => !(e.target === n.id && e.targetHandle === fieldId)));
          if (dataTimerRef.current) clearTimeout(dataTimerRef.current);
          dataTimerRef.current = setTimeout(
            () => pushHistory(latestNodesRef.current, latestEdgesRef.current),
            800
          );
        },
      },
    };
  });

  // ── Add node ──────────────────────────────────────────────────────────────────
  function addNode(type: string, position?: { x: number; y: number }) {
    const def = NODE_REGISTRY.find((n) => n.type === type);
    if (def?.singleton && nodes.some((n) => n.type === type)) {
      toast.info(`Only one ${def.label} node allowed per workflow`);
      return;
    }
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      typeVersion: 1,
      position: position ?? { x: 260, y: 160 },
      data: { ...(NODE_DEFAULTS[type] ?? {}) },
    } as Node;
    setNodes((nds) => [...nds, newNode]);
    deferPushHistory();
  }

  // ── Drop handler ──────────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const def = NODE_REGISTRY.find((n) => n.type === type) as NodeDef | undefined;
      if (def?.singleton && latestNodesRef.current.some((n) => n.type === type)) {
        toast.info(`Only one ${def.label} node allowed per workflow`);
        return;
      }
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newId = `${type}-${Date.now()}`;
      const newNode = {
        id: newId, type, typeVersion: 1, position,
        data: { ...(NODE_DEFAULTS[type] ?? {}) },
      } as Node;
      setNodes((nds) => [...nds, newNode]);

      if (def && def.primaryInput != null && def.primaryOutput != null) {
        const approxNode = { ...newNode, measured: { width: 224, height: 120 } };
        const edge = findEdgeUnderNode(
          approxNode as Node, latestEdgesRef.current, latestNodesRef.current, def,
        );
        if (edge) {
          const ts = Date.now();
          setEdges((eds) => [
            ...eds.filter((ex) => ex.id !== edge.id),
            { id: `e-split-${ts}-in`,  source: edge.source, sourceHandle: edge.sourceHandle ?? undefined, target: newId, targetHandle: def.primaryInput! },
            { id: `e-split-${ts}-out`, source: newId,       sourceHandle: def.primaryOutput!,             target: edge.target, targetHandle: edge.targetHandle ?? null },
          ]);
        }
      }
      deferPushHistory();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screenToFlowPosition, setNodes, setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // ── Pin data ──────────────────────────────────────────────────────────────────
  async function handlePinNode(nodeId: string, result: EvalResult) {
    const next = { ...pinData, [nodeId]: result };
    setPinData(next);
    await fetch(`/api/workflows/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinData: next }),
    });
  }

  async function handleUnpinNode(nodeId: string) {
    const next = { ...pinData };
    delete next[nodeId];
    setPinData(next);
    await fetch(`/api/workflows/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinData: Object.keys(next).length > 0 ? next : null }),
    });
  }

  // ── Save / activate ────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const payload = {
      name, is_active: isActive,
      nodes: nodes.map((n) => {
        const { id, type, position, data } = n;
        const typeVersion = (n as unknown as { typeVersion?: number }).typeVersion ?? 1;
        const { onChange: _fn, connectedHandles: _ch, onRemoveField: _orf, ...saveData } = data as Record<string, unknown>;
        const disabled = (n as unknown as { disabled?: boolean }).disabled;
        return { id, type, typeVersion, position, data: saveData, ...(disabled ? { disabled: true } : {}) };
      }),
      edges,
    };
    const res = await fetch(`/api/workflows/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } else {
      const json = await res.json();
      toast.error(json.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function toggleActive() {
    const next = !isActive;
    setIsActive(next);
    setToggling(true);
    try {
      const res = await fetch(`/api/workflows/${slug}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) {
        setIsActive(!next);
        toast.error("Failed to update status");
      } else {
        toast.success(next ? "Workflow activated" : "Workflow deactivated");
      }
    } finally {
      setToggling(false);
    }
  }

  // ── Export / Import ───────────────────────────────────────────────────────
  async function handleExport() {
    let presets: { name: string; body: string; headers?: Record<string, string>; query?: Record<string, string> }[] = [];
    try {
      const res = await fetch(`/api/workflows/${slug}/presets`);
      if (res.ok) {
        const data = await res.json() as { presets?: typeof presets };
        presets = (data.presets ?? []).map(({ name, body, headers, query }) => ({
          name, body,
          ...(headers && Object.keys(headers).length ? { headers } : {}),
          ...(query  && Object.keys(query).length  ? { query }  : {}),
        }));
      }
    } catch { /* best-effort */ }

    const blob = new Blob([JSON.stringify({ nodes, edges, presets }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${slug}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const importInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    nodes: Node[];
    edges: Edge[];
    presets: Array<{ name: string; body: string; headers?: Record<string, string>; query?: Record<string, string> }>;
  } | null>(null);

  function handleImportClick() { importInputRef.current?.click(); }

  function confirmImport() {
    if (!pendingImport) return;
    const { nodes: importedNodes, edges: importedEdges, presets } = pendingImport;
    setNodes(withDefaultNodes(importedNodes));
    setEdges(importedEdges);
    for (const preset of presets) {
      fetch(`/api/workflows/${slug}/presets`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: preset.name, body: preset.body, headers: preset.headers ?? {}, query: preset.query ?? {} }),
      }).catch(() => {});
    }
    setPendingImport(null);
    toast.success("Workflow imported successfully");
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.endsWith(".json")) { toast.error("Import failed: file must be a .json file"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result;
      if (typeof raw !== "string") return;
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { toast.error("Import failed: file is not valid JSON"); return; }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        toast.error("Import failed: expected a JSON object at the top level"); return;
      }
      const obj = parsed as Record<string, unknown>;
      if (!Array.isArray(obj.nodes)) { toast.error("Import failed: missing \"nodes\" array"); return; }
      if (!Array.isArray(obj.edges)) { toast.error("Import failed: missing \"edges\" array"); return; }
      const importedNodes = obj.nodes as unknown[];
      const importedEdges = obj.edges as unknown[];
      for (let i = 0; i < importedNodes.length; i++) {
        const n = importedNodes[i];
        if (typeof n !== "object" || n === null) { toast.error(`Import failed: nodes[${i}] is not an object`); return; }
        const node = n as Record<string, unknown>;
        if (typeof node.id !== "string" || !node.id) { toast.error(`Import failed: nodes[${i}] is missing a valid "id"`); return; }
        if (typeof node.type !== "string" || !node.type) { toast.error(`Import failed: nodes[${i}] is missing a valid "type"`); return; }
      }
      const nodeIds = new Set((importedNodes as Record<string, unknown>[]).map(n => n.id as string));
      for (let i = 0; i < importedEdges.length; i++) {
        const e = importedEdges[i];
        if (typeof e !== "object" || e === null) { toast.error(`Import failed: edges[${i}] is not an object`); return; }
        const edge = e as Record<string, unknown>;
        if (typeof edge.id !== "string" || !edge.id) { toast.error(`Import failed: edges[${i}] is missing a valid "id"`); return; }
        if (typeof edge.source !== "string" || !nodeIds.has(edge.source)) { toast.error(`Import failed: edges[${i}] "source" references unknown node "${edge.source}"`); return; }
        if (typeof edge.target !== "string" || !nodeIds.has(edge.target)) { toast.error(`Import failed: edges[${i}] "target" references unknown node "${edge.target}"`); return; }
      }
      const inputNodes = (importedNodes as Record<string, unknown>[]).filter(n => n.type === "workflowInput");
      if (inputNodes.length === 0) { toast.error("Import failed: workflow must have an Input node"); return; }
      if (inputNodes.length > 1) { toast.error("Import failed: workflow has more than one Input node"); return; }
      const presets: Array<{ name: string; body: string; headers?: Record<string, string>; query?: Record<string, string> }> =
        Array.isArray(obj.presets)
          ? (obj.presets as unknown[])
              .filter((p): p is Record<string, unknown> =>
                typeof p === "object" && p !== null &&
                typeof (p as Record<string, unknown>).name === "string" &&
                typeof (p as Record<string, unknown>).body === "string"
              )
              .map((p) => ({
                name: p.name as string, body: p.body as string,
                headers: (p.headers && typeof p.headers === "object" && !Array.isArray(p.headers)) ? p.headers as Record<string, string> : undefined,
                query:   (p.query   && typeof p.query   === "object" && !Array.isArray(p.query))   ? p.query   as Record<string, string> : undefined,
              }))
          : [];
      setPendingImport({ nodes: importedNodes as Node[], edges: importedEdges as Edge[], presets });
    };
    reader.readAsText(file);
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const nodeInfos = nodes.map((n) => ({
    id: n.id, type: n.type ?? "",
    label: NODE_REGISTRY.find((d) => d.type === n.type)?.label ?? (n.type ?? ""),
  }));

  return (
    <NodesContext.Provider value={{ nodes: nodeInfos }}>
    <VariablesContext.Provider value={{ names: variableNames, refresh: refreshVariables }}>
    <div className="flex flex-col flex-1 min-h-0 bg-[#0f0f0f]">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <CanvasTopBar
        slug={slug}
        name={name}
        onNameChange={setName}
        isActive={isActive}
        toggling={toggling}
        onToggleActive={toggleActive}
        saving={saving}
        showSaved={showSaved}
        onSave={handleSave}
        debugOpen={debugOpen}
        onToggleDebug={() => setDebugOpen((v) => !v)}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((v) => !v)}
      />

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        <NodeSidebar onAddNode={addNode} />

        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
          {/* React Flow */}
          <div
            ref={reactFlowWrapper}
            className="relative flex-1 min-h-0"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onMouseEnter={() => { mouseOverCanvas.current = true; }}
            onMouseLeave={() => { mouseOverCanvas.current = false; }}
            onMouseMove={(e) => { mouseScreenPos.current = { x: e.clientX, y: e.clientY }; }}
          >
            <ReactFlow
              nodes={nodesWithCallbacks}
              edges={styledEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeContextMenu={onEdgeContextMenu}
              onNodeContextMenu={onNodeContextMenu}
              onNodeDragStart={onNodeDragStart}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              nodeTypes={ALL_NODE_TYPES}
              deleteKeyCode="Delete"
              fitView
              colorMode="dark"
              minZoom={0.08}
              maxZoom={3}
              style={{ background: "#0f0f0f" }}
              defaultEdgeOptions={{ style: { stroke: "#4a4a4a", strokeWidth: 2 } }}
              proOptions={{ hideAttribution: true }}
            >
              <AdaptiveBackground />
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                nodeColor="#7c3aed"
                nodeStrokeColor="#7c3aed"
                maskColor="rgba(15, 15, 15, 0.6)"
                style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              />
            </ReactFlow>

            {historyOpen && (
              <HistoryPanel
                slug={slug}
                currentNodes={nodes}
                currentEdges={edges}
                onClose={() => setHistoryOpen(false)}
                onRestore={(restoredNodes, restoredEdges) => {
                  setNodes(withDefaultNodes(restoredNodes));
                  setEdges(restoredEdges as CanvasEdge[]);
                  pushHistory(restoredNodes, restoredEdges as CanvasEdge[]);
                }}
              />
            )}

            {searchMenu && (
              <NodeSearchMenu
                screenPos={searchMenu.screenPos}
                onSelect={(type) => { addNode(type, searchMenu.flowPos); setSearchMenu(null); }}
                onClose={() => setSearchMenu(null)}
              />
            )}

            {/* Node context menu */}
            {nodeMenu && (
              <div
                className="absolute z-50 min-w-[180px] rounded-lg border border-white/10 bg-[#1a1a1a] py-1 shadow-xl"
                style={{ top: nodeMenu.y, left: nodeMenu.x }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-violet-400 transition-colors"
                  onClick={() => {
                    setNodeMenu(null); setDebugOpen(true);
                    setTimeout(() => { rerunTriggerRef.current?.(nodeMenu.nodeId); }, 50);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                    <path d="M2 3.5L7 6 2 8.5V3.5Z" fill="currentColor" />
                    <path d="M9 2v8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Re-run from here
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors"
                  onClick={() => {
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === nodeMenu.nodeId ? { ...n, disabled: !isMenuNodeDisabled } as typeof n : n
                      )
                    );
                    deferPushHistory(); setNodeMenu(null);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                    {isMenuNodeDisabled
                      ? <path d="M4 6h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      : <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
                  </svg>
                  {isMenuNodeDisabled ? "Enable node" : "Disable node"}
                </button>
                {isMenuNodePinned ? (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-400/80 hover:bg-white/5 hover:text-amber-300 transition-colors"
                    onClick={() => { handleUnpinNode(nodeMenu.nodeId); setNodeMenu(null); }}
                  >
                    <PinOff className="h-3 w-3 shrink-0" />
                    Unpin output
                  </button>
                ) : (
                  !menuNodeHasPinnedResult && (
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/40 cursor-not-allowed"
                      disabled
                      title="Run the workflow first, then pin from the debug panel"
                    >
                      <Pin className="h-3 w-3 shrink-0" />
                      Pin output (run first)
                    </button>
                  )
                )}
              </div>
            )}

            {/* Edge context menu */}
            {edgeMenu && (
              <div
                className="absolute z-50 min-w-[160px] rounded-lg border border-white/10 bg-[#1a1a1a] py-1 shadow-xl"
                style={{ top: edgeMenu.y, left: edgeMenu.x }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  className={["flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    edgeMenu.currentType !== "error" ? "text-white bg-white/5" : "text-white/50 hover:bg-white/5 hover:text-white"].join(" ")}
                  onClick={() => {
                    setEdges((eds) => eds.map((e) => e.id === edgeMenu.edgeId ? { ...e, connectionType: undefined } as CanvasEdge : e));
                    setEdgeMenu(null); deferPushHistory();
                  }}
                >
                  <span className="h-2 w-2 rounded-full bg-[#4a4a4a] shrink-0" />
                  Main connection
                </button>
                <button
                  className={["flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    edgeMenu.currentType === "error" ? "text-red-400 bg-white/5" : "text-white/50 hover:bg-white/5 hover:text-red-400"].join(" ")}
                  onClick={() => {
                    setEdges((eds) => eds.map((e) => e.id === edgeMenu.edgeId ? { ...e, connectionType: "error" } as CanvasEdge : e));
                    setEdgeMenu(null); deferPushHistory();
                  }}
                >
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  Error connection
                </button>
              </div>
            )}

            {/* Trash drop zone */}
            <div
              ref={trashRef}
              className={[
                "absolute bottom-4 right-4 z-10 flex items-center justify-center gap-2",
                "h-12 px-5 rounded-xl border transition-all duration-150 pointer-events-none",
                isDraggingNode
                  ? isOverTrash
                    ? "opacity-100 scale-110 border-red-500/60 bg-red-500/20 text-red-400"
                    : "opacity-70 border-white/10 bg-[#1e1e1e] text-white/40"
                  : "opacity-0 scale-95 border-white/0 bg-transparent",
              ].join(" ")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M2 4h12M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l1 9.5A.5.5 0 0 0 4.5 14h7a.5.5 0 0 0 .5-.5L13 4"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-xs font-medium">
                {isOverTrash ? "Release to delete" : "Drop to delete"}
              </span>
            </div>
          </div>

          {debugOpen && (
            <DebugPanel
              slug={slug}
              nodes={nodes}
              edges={edges}
              onClose={() => { setDebugOpen(false); setHighlightedNodeId(null); }}
              onNodeHighlight={setHighlightedNodeId}
              highlightedNodeId={highlightedNodeId}
              pinData={pinData}
              onPinNode={handlePinNode}
              onUnpinNode={handleUnpinNode}
              rerunTriggerRef={rerunTriggerRef}
            />
          )}

          {/* ── Status bar ────────────────────────────────────────────────── */}
          <CanvasStatusBar
            slug={slug}
            nodes={nodes}
            onZoomIn={() => zoomBy(1.4)}
            onZoomOut={() => zoomBy(1 / 1.4)}
            onFitView={() => fitView({ duration: 300 })}
            onImportClick={handleImportClick}
            onExport={handleExport}
            importInputRef={importInputRef}
            onImportFile={handleImportFile}
          />
        </div>
      </div>
    </div>

    {/* Import confirmation dialog */}
    <Dialog open={pendingImport !== null} onOpenChange={(open) => { if (!open) setPendingImport(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-400 shrink-0" />
            Replace current workflow?
          </DialogTitle>
          <DialogDescription>
            Importing this file will permanently replace all nodes, edges, and connections in the current workflow. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={() => setPendingImport(null)}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[12px] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmImport}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
          >
            Replace workflow
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    </VariablesContext.Provider>
    </NodesContext.Provider>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
