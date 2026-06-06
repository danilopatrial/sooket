"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type { SizeOfNodeData } from "@/lib/node-types";
import type { SizeOfNodeData } from "@/lib/node-types";

function SizeOfNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d = data as unknown as SizeOfNodeData;
  const connected = d.connectedHandles ?? [];

  const nodeRef = useRef<HTMLDivElement>(null);
  const rowRef  = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    if (!nodeRef.current || !rowRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const r = rowRef.current.getBoundingClientRect();
    setTop((r.top + r.height / 2 - nodeTop) / zoom);
  }, [zoom]);

  const inputDot  = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-indigo-400";
  const outputDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-indigo-400";
  const isConnected = connected.includes("input");

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-44 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-indigo-500/50 shadow-indigo-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top }} className={inputDot} />
      <Handle type="source" id="output" position={Position.Right} style={{ top }} className={outputDot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 font-mono select-none">
          |x|
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Size Of</p>
          <p className="text-[11px] text-indigo-300/70 mt-0.5">counts characters</p>
        </div>
      </div>

      {/* Body */}
      <div ref={rowRef} className="flex items-center justify-between px-4 py-3">
        <span className={cn(
          "text-[11px] font-mono",
          isConnected ? "text-indigo-300" : "text-white/25"
        )}>text input</span>
        <span className="text-[11px] font-mono text-white/25">char count</span>
      </div>
    </div>
  );
}

export const SizeOfNode = memo(SizeOfNodeComponent);
