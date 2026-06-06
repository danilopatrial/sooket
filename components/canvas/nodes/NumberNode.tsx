"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type { NumberNodeData } from "@/lib/node-types";
import type { NumberNodeData } from "@/lib/node-types";

function NumberNodeComponent({ data, selected }: NodeProps) {
  const d          = data as unknown as NumberNodeData;
  const fixedValue = d.fixedValue ?? null;
  const value      = d.value      ?? 0.5;
  const min        = d.min        ?? 0;
  const max        = d.max        ?? 1;
  const onChange   = d.onChange;

  const isFixed   = fixedValue !== null && !Number.isNaN(fixedValue);
  const safeValue = Math.min(Math.max(value, min), max);
  const step      = Math.max(0.001, (max - min) / 100);

  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";

  return (
    <div
      className={cn(
        "w-56 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-amber-500/50 shadow-amber-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="source" id="output" position={Position.Right} className={mainHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          #
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Number</p>
          <p className="text-[11px] text-amber-300/70 mt-0.5 font-mono truncate">
            {isFixed ? `fixed: ${fixedValue}` : `value: ${safeValue.toFixed(3)}`}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 nodrag">

        {/* Fixed Value */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Fixed Value
          </p>
          <input
            type="number"
            value={fixedValue ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const raw = e.target.value;
              onChange?.({ fixedValue: raw === "" ? null : parseFloat(raw) });
            }}
            placeholder="leave empty to use slider"
            className="w-full rounded-lg border border-white/[0.08] bg-[#252527] px-3 py-2 text-[12px] text-white/90 focus:outline-none focus:border-amber-500/40 transition-colors placeholder-white/20"
          />
        </div>

        {/* Range + Slider — dimmed when fixed value is set */}
        <div className={cn("space-y-4", isFixed && "opacity-35 pointer-events-none")}>

          <div className="space-y-1.5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              Range
            </p>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <p className="text-[9px] text-white/20">Min</p>
                <input
                  type="number"
                  value={min}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange?.({ min: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/90 focus:outline-none focus:border-amber-500/40 transition-colors"
                />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-[9px] text-white/20">Max</p>
                <input
                  type="number"
                  value={max}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange?.({ max: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/90 focus:outline-none focus:border-amber-500/40 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">
                Value
              </p>
              <span className="text-[11px] font-mono text-white/40">{safeValue.toFixed(3)}</span>
            </div>
            <Slider
              min={min}
              max={max}
              step={step}
              value={[safeValue]}
              onValueChange={(vals) => {
                const v = Array.isArray(vals) ? vals[0] : (vals as number);
                onChange?.({ value: v });
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export const NumberNode = memo(NumberNodeComponent);
