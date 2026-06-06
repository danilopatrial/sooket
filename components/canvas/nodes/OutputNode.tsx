"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function OutputNodeComponent({ selected }: NodeProps) {
  return (
    <div className={cn(
      "relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border bg-[#1a1a1c] shadow-lg w-44 overflow-hidden",
      selected ? "border-blue-500/50 shadow-blue-900/20 shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_0_20px_rgba(59,130,246,0.15)]" : "border-white/[0.08]"
    )}>
      {/* Right accent bar */}
      <div className="absolute right-0 inset-y-0 w-[3px] bg-blue-500 rounded-r-xl" />

      {/* Label */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white leading-none">Output</p>
        <p className="text-[11px] text-white/35 mt-0.5">API response</p>
      </div>

      {/* Icon */}
      <div className="h-7 w-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
        <ArrowLeft className="h-3.5 w-3.5 text-blue-400" />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-400 !w-3 !h-3 !border-2 !border-[#1a1a1c]"
      />
    </div>
  );
}

export const OutputNode = memo(OutputNodeComponent);
