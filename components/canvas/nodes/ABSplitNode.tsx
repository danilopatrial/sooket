"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Dices, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type { ABSplitBranch, ABSplitNodeData } from "@/lib/node-types";
import type { ABSplitNodeData } from "@/lib/node-types";

const BRANCH_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_BRANCHES = 8;
const MIN_BRANCHES = 2;

function ABSplitNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d        = data as unknown as ABSplitNodeData;
  const branches = d.branches ?? [{ id: "a", weight: 50 }, { id: "b", weight: 50 }];
  const onChange = d.onChange;

  const nodeRef     = useRef<HTMLDivElement>(null);
  const inputRowRef = useRef<HTMLDivElement>(null);
  const outRefs     = useRef<Map<string, HTMLElement>>(new Map());

  const [inputTop, setInputTop] = useState(0);
  const [outTops, setOutTops]   = useState<Record<string, number>>({});

  const branchIds = branches.map((b) => b.id).join(",");
  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (el: HTMLElement | null) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setInputTop(mid(inputRowRef.current));
    const tops: Record<string, number> = {};
    branches.forEach((b) => { tops[b.id] = mid(outRefs.current.get(b.id) ?? null); });
    setOutTops(tops);
  }, [branchIds, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalWeight = branches.reduce((s, b) => s + (b.weight ?? 0), 0);
  const weightValid = totalWeight === 100;

  function addBranch() {
    if (branches.length >= MAX_BRANCHES) return;
    const id = Math.random().toString(36).slice(2, 8);
    onChange?.({ branches: [...branches, { id, weight: 0 }] });
  }

  function removeBranch(id: string) {
    if (branches.length <= MIN_BRANCHES) return;
    onChange?.({ branches: branches.filter((b) => b.id !== id) });
  }

  function updateWeight(id: string, raw: string) {
    const parsed = parseInt(raw, 10);
    const w = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
    onChange?.({ branches: branches.map((b) => b.id === id ? { ...b, weight: w } : b) });
  }

  const inputDot  = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-green-400";
  const branchDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-green-400";

  const subtitle = branches.length === 0
    ? "add branches"
    : branches.map((b, i) => `${BRANCH_LABELS[i] ?? "?"}:${b.weight}%`).join(" ");

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-green-500/50 shadow-green-900/20" : "border-white/[0.08]"
      )}
    >
      {/* Input target handle */}
      <Handle
        type="target"
        id="input"
        position={Position.Left}
        style={{ top: inputTop }}
        className={inputDot}
      />

      {/* Per-branch source handles */}
      {branches.map((b) => (
        <Handle
          key={b.id}
          type="source"
          id={b.id}
          position={Position.Right}
          style={{ top: outTops[b.id] ?? 0 }}
          className={branchDot}
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
          <Dices className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">A/B Split</p>
          <p className="text-[11px] text-green-300/70 mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 nodrag">

        {/* Input anchor */}
        <div ref={inputRowRef} className="flex items-center h-6">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">input</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Branch rows */}
        <div>
          <div className="flex items-center gap-1.5 px-0.5 mb-1">
            <p className="w-6 text-[9px] text-white/20 uppercase tracking-wider text-center">BR</p>
            <p className="flex-1 text-[9px] text-white/20 uppercase tracking-wider">weight</p>
            <div className="w-5 shrink-0" />
            <div className="h-4 w-6 shrink-0" />
          </div>

          <div className="space-y-1.5">
            {branches.map((b, i) => (
              <div key={b.id} className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-md bg-green-500/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-green-400">
                    {BRANCH_LABELS[i] ?? "?"}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={b.weight}
                  onChange={(e) => updateWeight(b.id, e.target.value)}
                  className={cn(
                    "flex-1 min-w-0 rounded-lg border bg-white/[0.04] px-2.5 py-1.5",
                    "text-[12px] font-mono text-white/90 focus:outline-none transition-colors",
                    "border-white/[0.08] focus:border-green-500/40"
                  )}
                />
                <span className="text-[11px] text-white/40">%</span>
                <button
                  onClick={() => removeBranch(b.id)}
                  disabled={branches.length <= MIN_BRANCHES}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Weight total indicator */}
        <div className={cn(
          "flex items-center justify-between px-0.5",
          weightValid ? "text-green-400/60" : "text-red-400/80"
        )}>
          <span className="text-[10px] uppercase tracking-wider">total</span>
          <span className="text-[11px] font-mono font-semibold">
            {totalWeight}%{!weightValid && " ≠ 100"}
          </span>
        </div>

        {/* Add branch button — hidden once at max */}
        {branches.length < MAX_BRANCHES && (
          <button
            onClick={addBranch}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add branch
          </button>
        )}

        <div className="border-t border-white/[0.06]" />

        {/* Output label rows — handles anchored here */}
        <div className="space-y-1">
          {branches.map((b, i) => (
            <div
              key={b.id}
              ref={(el) => {
                if (el) outRefs.current.set(b.id, el);
                else outRefs.current.delete(b.id);
              }}
              className="flex items-center justify-end gap-1.5 h-6"
            >
              <span className="text-[11px] font-mono text-green-400/70">
                {BRANCH_LABELS[i] ?? "?"} · {b.weight}%
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export const ABSplitNode = memo(ABSplitNodeComponent);
