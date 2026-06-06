"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";

const HANDLE_TOP = 28;

function ArrayLengthNodeComponent({ data, selected }: NodeProps) {
  const connected = ((data as { connectedHandles?: string[] }).connectedHandles) ?? [];

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-indigo-400";

  return (
    <div
      className={cn(
        "w-44 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-indigo-500/50 shadow-indigo-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top: HANDLE_TOP }} className={dot} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: HANDLE_TOP }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-indigo-700 flex items-center justify-center shrink-0">
          <List className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Array Length</p>
          <p className="text-[11px] text-indigo-300/70 mt-0.5">count items in a list</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 nodrag">
        <div className="flex items-center justify-between h-7">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-indigo-300" : "text-white/30"
          )}>list / array</span>
          <span className="text-[11px] font-mono text-indigo-300/50">count</span>
        </div>
      </div>
    </div>
  );
}

export const ArrayLengthNode = memo(ArrayLengthNodeComponent);
