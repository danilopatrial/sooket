"use client";

import { memo, useRef, useLayoutEffect, useState, useEffect } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type { SubWorkflowNodeData } from "@/lib/node-types";
import type { SubWorkflowNodeData } from "@/lib/node-types";

interface WorkflowOption { slug: string; name: string }

type Tops = { input: number; output: number };

function SubWorkflowNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d        = data as unknown as SubWorkflowNodeData;
  const slug     = d.slug ?? "";
  const onChange = d.onChange;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const inputRowRef  = useRef<HTMLDivElement>(null);
  const outputRowRef = useRef<HTMLDivElement>(null);
  const [tops, setTops]    = useState<Tops>({ input: 56, output: 130 });
  const [options, setOptions] = useState<WorkflowOption[]>([]);

  // Fetch workflow list once on mount for the picker
  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((rows: WorkflowOption[]) => setOptions(rows))
      .catch(() => {});
  }, []);

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (el: HTMLElement | null | undefined) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({ input: mid(inputRowRef.current), output: mid(outputRowRef.current) });
  }, [zoom]);

  return (
    <div
      ref={nodeRef}
      className={cn(
        "rounded-[18px] border bg-[#141414] text-white shadow-xl transition-shadow min-w-[220px]",
        selected ? "border-white/30 shadow-white/10" : "border-white/10 shadow-black/40"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20">
          <Layers className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <span className="text-[13px] font-semibold text-white/90">Sub-Workflow</span>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {/* Input row */}
        <div ref={inputRowRef} className="flex items-center justify-between gap-2 text-[11px] text-white/40">
          <span>input</span>
        </div>

        {/* Slug picker */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-white/30">Target Workflow</label>
          {options.length > 0 ? (
            <select
              className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-violet-500/60 nodrag"
              value={slug}
              onChange={(e) => onChange?.({ slug: e.target.value })}
            >
              <option value="">— select —</option>
              {options.map((o) => (
                <option key={o.slug} value={o.slug}>{o.name} ({o.slug})</option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/60 nodrag"
              placeholder="workflow-slug"
              value={slug}
              onChange={(e) => onChange?.({ slug: e.target.value })}
            />
          )}
        </div>

        {/* Output row */}
        <div ref={outputRowRef} className="flex items-center justify-end text-[11px] text-white/40 mt-1">
          <span>output</span>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ top: tops.input, background: "#6366f1", width: 10, height: 10, border: "2px solid #1a1a2e" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: tops.output, background: "#6366f1", width: 10, height: 10, border: "2px solid #1a1a2e" }}
      />
    </div>
  );
}

export const SubWorkflowNode = memo(SubWorkflowNodeComponent);
