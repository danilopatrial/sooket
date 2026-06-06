"use client";

import { useState, useEffect, useCallback } from "react";
import { X, RotateCcw, ChevronRight, ChevronDown } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";

/** Shape returned by GET /api/workflows/[slug]/versions — nodes include position */
interface VersionNode {
  id: string;
  type: string;
  [key: string]: unknown;
}

interface VersionEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

interface VersionEntry {
  id: number;
  created_at: string;
  nodes: VersionNode[];
  edges: VersionEdge[];
}

interface NodeDiff {
  id: string;
  type: string;
  status: "added" | "removed" | "unchanged";
}

function computeDiff(versionNodes: VersionNode[], currentNodes: Node[]): NodeDiff[] {
  const currentIds = new Set(currentNodes.map((n) => n.id));
  const versionIds = new Set(versionNodes.map((n) => n.id));

  const result: NodeDiff[] = [];

  for (const n of versionNodes) {
    result.push({
      id: n.id,
      type: n.type,
      status: currentIds.has(n.id) ? "unchanged" : "added",
    });
  }

  for (const n of currentNodes) {
    if (!versionIds.has(n.id)) {
      result.push({
        id: n.id,
        type: n.type ?? "unknown",
        status: "removed",
      });
    }
  }

  return result;
}

function formatVersionTime(isoStr: string): string {
  try {
    return new Date(isoStr + "Z").toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

interface HistoryPanelProps {
  slug: string;
  currentNodes: Node[];
  currentEdges: Edge[];
  onClose: () => void;
  onRestore: (nodes: Node[], edges: Edge[]) => void;
}

export function HistoryPanel({ slug, currentNodes, onClose, onRestore }: HistoryPanelProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [expandedDiff, setExpandedDiff] = useState(false);

  const [fetchSeq, setFetchSeq] = useState(0);

  const fetchVersions = useCallback(() => {
    setFetchSeq((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/workflows/${slug}/versions`)
      .then((r) => r.json())
      .then((d: { versions?: VersionEntry[] }) => { if (!cancelled) setVersions(d.versions ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, fetchSeq]);

  const selectedVersion = versions.find((v) => v.id === selectedId) ?? null;
  const diff = selectedVersion ? computeDiff(selectedVersion.nodes, currentNodes) : [];

  const added   = diff.filter((d) => d.status === "added");
  const removed = diff.filter((d) => d.status === "removed");
  const unchanged = diff.filter((d) => d.status === "unchanged");

  async function handleRestore() {
    if (!selectedVersion) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/workflows/${slug}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: selectedVersion.id }),
      });
      if (!res.ok) return;
      onRestore(selectedVersion.nodes as unknown as Node[], selectedVersion.edges as unknown as Edge[]);
      fetchVersions();
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="absolute top-0 right-0 h-full w-72 z-20 flex flex-col border-l border-white/[0.08] bg-[#111111] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-white/[0.06] shrink-0">
        <span className="text-xs font-medium text-white/70">Version History</span>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Close history"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-16 text-xs text-white/30">Loading…</div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 text-xs text-white/30 px-4 text-center">
            No saved versions yet. Save nodes or edges to create one.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {versions.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelectedId(v.id === selectedId ? null : v.id);
                  setExpandedDiff(false);
                }}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                  selectedId === v.id
                    ? "bg-violet-500/10 text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80",
                ].join(" ")}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono truncate">{formatVersionTime(v.created_at)}</p>
                  <p className="text-[10px] text-white/30">{v.nodes.length} nodes</p>
                </div>
                {i === 0 && (
                  <span className="text-[10px] text-violet-400/70 shrink-0">latest</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Diff + restore */}
      {selectedVersion && (
        <div className="border-t border-white/[0.06] shrink-0">
          {/* Diff summary */}
          <button
            type="button"
            onClick={() => setExpandedDiff((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-white/30">
              {expandedDiff ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
            <span className="text-xs text-white/50">Diff vs. current canvas</span>
            <div className="flex items-center gap-1 ml-auto">
              {added.length > 0 && (
                <span className="text-[10px] text-emerald-400">+{added.length}</span>
              )}
              {removed.length > 0 && (
                <span className="text-[10px] text-red-400">-{removed.length}</span>
              )}
              {added.length === 0 && removed.length === 0 && (
                <span className="text-[10px] text-white/30">no change</span>
              )}
            </div>
          </button>

          {expandedDiff && (
            <div className="px-3 pb-2 space-y-0.5 max-h-48 overflow-auto">
              {added.map((d) => (
                <div key={`add-${d.id}`} className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="text-emerald-500 font-bold">+</span>
                  <span className="font-mono truncate">{d.type} <span className="text-white/20">{d.id}</span></span>
                </div>
              ))}
              {removed.map((d) => (
                <div key={`rm-${d.id}`} className="flex items-center gap-1.5 text-xs text-red-400">
                  <span className="text-red-500 font-bold">−</span>
                  <span className="font-mono truncate">{d.type} <span className="text-white/20">{d.id}</span></span>
                </div>
              ))}
              {unchanged.map((d) => (
                <div key={`unc-${d.id}`} className="flex items-center gap-1.5 text-xs text-white/25">
                  <span className="w-2.5 text-center">·</span>
                  <span className="font-mono truncate">{d.type} <span className="text-white/15">{d.id}</span></span>
                </div>
              ))}
            </div>
          )}

          <div className="px-3 py-2">
            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              {restoring ? "Restoring…" : "Restore this version"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
