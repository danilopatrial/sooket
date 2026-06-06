"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ShieldCheck, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { CustomPattern, PiiRedactNodeData } from "@/lib/node-types";
import type { PiiRedactNodeData } from "@/lib/node-types";






const PRESETS = [
  { label: "<type>",     value: "",            },
  { label: "[REDACTED]", value: "[REDACTED]",  },
  { label: "***",        value: "***",         },
];

const HANDLE_TOP = 28;

function PiiRedactNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as PiiRedactNodeData;
  const replacement    = d.replacement     ?? "";
  const customPatterns = d.customPatterns  ?? [];
  const onChange       = d.onChange;

  function addPattern() {
    const id = Math.random().toString(36).slice(2, 8);
    onChange?.({ customPatterns: [...customPatterns, { id, label: "", regex: "" }] });
  }

  function removePattern(id: string) {
    onChange?.({ customPatterns: customPatterns.filter((p) => p.id !== id) });
  }

  function updatePattern(id: string, field: "label" | "regex", value: string) {
    onChange?.({ customPatterns: customPatterns.map((p) => p.id === id ? { ...p, [field]: value } : p) });
  }

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";

  return (
    <div
      className={cn(
        "w-72 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-rose-500/50 shadow-rose-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top: HANDLE_TOP }} className={dot} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: HANDLE_TOP }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">PII Redact</p>
          <p className="text-[11px] text-rose-300/70 mt-0.5">redact sensitive data, via RegEx</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">

        {/* Replacement */}
        <div className="space-y-2">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Replace With
          </p>
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onChange?.({ replacement: p.value })}
                className={cn(
                  "flex-1 rounded-md border transition-colors",
                  replacement === p.value
                    ? "bg-rose-600/30 border-rose-500/50 text-rose-300"
                    : "bg-[#252527] border-white/[0.08] text-white/40 hover:text-white/70"
                )}
              >
                <p className="text-[10px] font-mono py-1 leading-none">{p.label}</p>
              </button>
            ))}
          </div>
          <VarField
            as="input"
            value={replacement}
            onChange={(v) => onChange?.({ replacement: v })}
            placeholder="or type a custom replacement…"
            focusBorderClass="focus:border-rose-500/40"
            typographyClass="text-[12px] px-2.5 py-1.5 font-mono"
            textColorClass="text-white/80"
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Custom patterns */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Custom Patterns
          </p>

          {customPatterns.length > 0 && (
            <div className="flex items-center gap-1.5 px-0.5 mb-0.5">
              <p className="w-20 text-[9px] text-white/20 uppercase tracking-wider shrink-0">label</p>
              <p className="flex-1 text-[9px] text-white/20 uppercase tracking-wider">regex pattern</p>
              <div className="h-4 w-6 shrink-0" />
            </div>
          )}

          {customPatterns.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <input
                type="text"
                value={p.label}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updatePattern(p.id, "label", e.target.value)
                }
                placeholder="e.g. PHONE"
                className="w-20 min-w-0 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/90 font-mono uppercase focus:outline-none focus:border-rose-500/40 transition-colors placeholder-white/20 shrink-0"
              />
              <input
                type="text"
                value={p.regex}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updatePattern(p.id, "regex", e.target.value)
                }
                placeholder="\d{3}-\d{4}"
                className="flex-1 min-w-0 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/60 font-mono focus:outline-none focus:border-rose-500/40 transition-colors placeholder-white/20"
              />
              <button
                onClick={() => removePattern(p.id)}
                className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <button
            onClick={addPattern}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add pattern
          </button>
        </div>

      </div>
    </div>
  );
}

export const PiiRedactNode = memo(PiiRedactNodeComponent);
