"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type { BooleanNodeData } from "@/lib/node-types";
import type { BooleanNodeData } from "@/lib/node-types";

function BooleanNodeComponent({ data, selected }: NodeProps) {
  const d        = data as unknown as BooleanNodeData;
  const value    = d.value ?? false;
  const onChange = d.onChange;

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400";

  return (
    <div
      className={cn(
        "w-44 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-emerald-500/50 shadow-emerald-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="source" id="output" position={Position.Right} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-[10px] shrink-0 font-mono select-none">
          01
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Boolean</p>
          <p className="text-[11px] text-emerald-300/70 mt-0.5">true or false</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 nodrag">
        <button
          onClick={() => onChange?.({ value: !value })}
          className={cn(
            "w-full py-2 rounded-xl border text-[13px] font-mono font-bold tracking-wide transition-colors",
            value
              ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30"
              : "bg-rose-600/20    border-rose-500/40    text-rose-300    hover:bg-rose-600/30"
          )}
        >
          {value ? "true" : "false"}
        </button>
      </div>
    </div>
  );
}

export const BooleanNode = memo(BooleanNodeComponent);
