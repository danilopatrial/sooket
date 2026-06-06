"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { NullCheckNodeData } from "@/lib/node-types";
import type { NullCheckNodeData } from "@/lib/node-types";

function NullCheckNodeComponent({ data, selected }: NodeProps) {
  const { zoom }   = useViewport();
  const d          = data as unknown as NullCheckNodeData;
  const fallback   = d.fallback  ?? "";
  const connected  = d.connectedHandles ?? [];
  const onChange   = d.onChange;

  const isFallbackConnected = connected.includes("fallback");

  const nodeRef        = useRef<HTMLDivElement>(null);
  const inputRowRef    = useRef<HTMLDivElement>(null);
  const fallbackRowRef = useRef<HTMLDivElement>(null);
  const outputRowRef   = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState({ input: 0, fallback: 0, output: 0 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({ input: mid(inputRowRef), fallback: mid(fallbackRowRef), output: mid(outputRowRef) });
  }, [zoom]);

  const dot         = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";
  const fallbackDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-52 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-amber-500/50 shadow-amber-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"    position={Position.Left}  style={{ top: tops.input    }} className={dot} />
      <Handle type="target" id="fallback" position={Position.Left}  style={{ top: tops.fallback }} className={fallbackDot} />
      <Handle type="source" id="output"   position={Position.Right} style={{ top: tops.output   }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-amber-700 flex items-center justify-center shrink-0">
          <ShieldAlert className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Null Check</p>
          <p className="text-[11px] text-amber-300/70 mt-0.5">fallback if value is empty</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2 nodrag">

        {/* Input row */}
        <div ref={inputRowRef} className="flex items-center justify-between h-7">
          <span className={cn("text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-amber-300" : "text-white/30"
          )}>value</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Fallback row */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Fallback
          </p>
          <div ref={fallbackRowRef}>
            <VarField
              as="input"
              value={fallback}
              onChange={(v) => onChange?.({ fallback: v })}
              placeholder="backup value…"
              disabled={isFallbackConnected}
              focusBorderClass="focus:border-amber-500/40"
              typographyClass="text-[11px] px-2 py-1.5 font-mono"
              textColorClass="text-white/70"
            />
          </div>
          {isFallbackConnected && (
            <p className="text-[9px] text-white/20">using connected value</p>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output row */}
        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-amber-300/50">output</span>
        </div>

      </div>
    </div>
  );
}

export const NullCheckNode = memo(NullCheckNodeComponent);
