"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
export type { CastTarget, TypeCastNodeData } from "@/lib/node-types";
import type { CastTarget, TypeCastNodeData } from "@/lib/node-types";






const HANDLE_TOP = 28;

const TARGETS: { value: CastTarget; label: string; friendly: string; color: string }[] = [
  { value: "string",  label: "string",  friendly: "text",       color: "bg-teal-600/30    border-teal-500/50    text-teal-300"    },
  { value: "number",  label: "number",  friendly: "numeric",    color: "bg-amber-600/30   border-amber-500/50   text-amber-300"   },
  { value: "boolean", label: "boolean", friendly: "true / false", color: "bg-emerald-600/30 border-emerald-500/50 text-emerald-300" },
];

function TypeCastNodeComponent({ data, selected }: NodeProps) {
  const d        = data as unknown as TypeCastNodeData;
  const target   = d.target   ?? "string";
  const onChange = d.onChange;

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-yellow-400";

  return (
    <div
      className={cn(
        "w-48 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-yellow-500/50 shadow-yellow-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top: HANDLE_TOP }} className={dot} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: HANDLE_TOP }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-yellow-700 flex items-center justify-center shrink-0">
          <ArrowLeftRight className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Type Cast</p>
          <p className="text-[11px] text-yellow-300/70 mt-0.5 font-mono">convert to {target}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-1.5 nodrag">
        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
          Convert To
        </p>
        {TARGETS.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange?.({ target: t.value })}
            className={cn(
              "w-full py-1.5 px-3 rounded-lg border text-left transition-colors",
              target === t.value ? t.color : "bg-[#252527] border-white/[0.08] text-white/30 hover:text-white/60"
            )}
          >
            <span className="text-[11px] font-mono font-semibold leading-none block">{t.label}</span>
            <span className="text-[9px] leading-none mt-0.5 block opacity-60"></span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const TypeCastNode = memo(TypeCastNodeComponent);
