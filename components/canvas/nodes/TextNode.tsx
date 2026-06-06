"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { TextNodeData } from "@/lib/node-types";
import type { TextNodeData } from "@/lib/node-types";

function TextNodeComponent({ data, selected }: NodeProps) {
  const d      = data as unknown as TextNodeData;
  const text   = d.text   ?? "";
  const onChange = d.onChange;

  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-teal-400";

  return (
    <div
      className={cn(
        "w-56 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-teal-500/50 shadow-teal-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="source" id="output" position={Position.Right} className={mainHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          T
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Text</p>
          <p className="text-[11px] text-teal-300/70 mt-0.5 truncate">outputs this exact text</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 nodrag">
        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
          Content
        </p>
        <VarField
          value={text}
          onChange={(v) => onChange?.({ text: v })}
          rows={4}
          placeholder="Enter text…"
          focusBorderClass="focus:border-teal-500/40"
          expandTitle="Content"
        />
      </div>
    </div>
  );
}

export const TextNode = memo(TextNodeComponent);
