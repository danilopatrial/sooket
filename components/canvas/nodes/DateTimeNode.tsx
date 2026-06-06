"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { DateTimeMode, DateTimeNodeData } from "@/lib/node-types";
import type { DateTimeNodeData } from "@/lib/node-types";






const HANDLE_TOP = 28;

const FORMAT_PRESETS = [
  { label: "ISO",    hint: "2025-01-15T12:00:00Z" },
  { label: "unix",   hint: "1736942400"            },
  { label: "locale", hint: "1/15/2025, 12:00 PM"  },
] as const;

function DateTimeNodeComponent({ data, selected }: NodeProps) {
  const d         = data as unknown as DateTimeNodeData;
  const mode      = d.mode      ?? "now";
  const formatStr = d.formatStr ?? "ISO";
  const onChange  = d.onChange;

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";

  return (
    <div
      className={cn(
        "w-60 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-violet-500/50 shadow-violet-900/20" : "border-white/[0.08]"
      )}
    >
      {mode === "format" && (
        <Handle type="target" id="input" position={Position.Left} style={{ top: HANDLE_TOP }} className={dot} />
      )}
      <Handle type="source" id="output" position={Position.Right} style={{ top: HANDLE_TOP }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-violet-700 flex items-center justify-center shrink-0">
          <Clock className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Date / Time</p>
          <p className="text-[11px] text-violet-300/70 mt-0.5 font-mono">
            {mode === "now" ? "current timestamp" : "formats a date value"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5 nodrag">

        {/* Mode toggle */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
            Mode
          </p>
          <div className="flex gap-1">
            {([
              { value: "now",    hint: "current time" },
              { value: "format", hint: "parse a date" },
            ] as const).map((m) => (
              <button
                key={m.value}
                onClick={() => onChange?.({ mode: m.value })}
                className={cn(
                  "flex-1 rounded-md border transition-colors",
                  mode === m.value
                    ? "bg-violet-600/30 border-violet-500/50 text-violet-300"
                    : "bg-[#252527] border-white/[0.08] text-white/35 hover:text-white/60"
                )}
              >
                <p className="text-[11px] font-mono py-1 leading-none">{m.value}</p>
                <p className="text-[8px] text-white/30 pb-1 leading-none">{m.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Format presets */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
            Format
          </p>
          <div className="flex gap-1 mb-1.5">
            {FORMAT_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onChange?.({ formatStr: p.label })}
                className={cn(
                  "flex-1 py-1 rounded-md text-[10px] font-mono border transition-colors",
                  formatStr === p.label
                    ? "bg-violet-600/30 border-violet-500/50 text-violet-300"
                    : "bg-[#252527] border-white/[0.08] text-white/30 hover:text-white/60"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <VarField
            as="input"
            value={formatStr}
            onChange={(v) => onChange?.({ formatStr: v })}
            placeholder="ISO"
            focusBorderClass="focus:border-violet-500/40"
            typographyClass="text-[11px] px-2 py-1.5 font-mono"
            textColorClass="text-white/80"
          />
          <p className="text-[9px] text-white/15 mt-1 font-mono">
            {FORMAT_PRESETS.find((p) => p.label === formatStr)?.hint ?? "custom format string"}
          </p>
        </div>

      </div>
    </div>
  );
}

export const DateTimeNode = memo(DateTimeNodeComponent);
