"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { StringOp, StringOpsNodeData } from "@/lib/node-types";
import type { StringOp, StringOpsNodeData } from "@/lib/node-types";






const OPS: { value: StringOp; label: string; }[] = [
  { value: "uppercase", label: "UPPER" },
  { value: "lowercase", label: "lower" },
  { value: "trim",      label: "trim"  },
  { value: "split",     label: "split" },
  { value: "slice",     label: "slice" },
];

const HANDLE_TOP = 28;

function StringOpsNodeComponent({ data, selected }: NodeProps) {
  const { zoom }        = useViewport();
  const d               = data as unknown as StringOpsNodeData;
  const op              = d.op              ?? "uppercase";
  const separator       = d.separator       ?? ",";
  const sliceStart      = d.sliceStart      ?? 0;
  const sliceEnd        = d.sliceEnd        ?? 0;
  const sliceEndEnabled = d.sliceEndEnabled ?? false;
  const onChange        = d.onChange;

  const nodeRef    = useRef<HTMLDivElement>(null);
  const outputRef  = useRef<HTMLDivElement>(null);
  const [outTop, setOutTop] = useState(HANDLE_TOP);

  useLayoutEffect(() => {
    if (!nodeRef.current || !outputRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const r = outputRef.current.getBoundingClientRect();
    setOutTop((r.top + r.height / 2 - nodeTop) / zoom);
  }, [op, zoom]);

  const dot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-sky-400";
  const inpCls = "w-full rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/80 font-mono focus:outline-none focus:border-sky-500/40 transition-colors placeholder-white/20";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-56 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-sky-500/50 shadow-sky-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top: HANDLE_TOP }} className={dot} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: outTop }}     className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-sky-700 flex items-center justify-center shrink-0">
          <Type className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">String Ops</p>
          <p className="text-[11px] text-sky-300/70 mt-0.5">transform text values</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5 nodrag">

        {/* Operation picker */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
            Operation
          </p>
          <div className="flex gap-1 flex-wrap">
            {OPS.map((o) => (
              <button
                key={o.value}
                onClick={() => onChange?.({ op: o.value })}
                className={cn(
                  "flex-1 rounded-md border transition-colors min-w-0",
                  op === o.value
                    ? "bg-sky-600/30 border-sky-500/50 text-sky-300"
                    : "bg-[#252527] border-white/[0.08] text-white/35 hover:text-white/60"
                )}
              >
                <p className="text-[10px] font-mono py-1 leading-none">{o.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Split config */}
        {op === "split" && (
          <div className="space-y-1">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              Separator
            </p>
            <VarField
              as="input"
              value={separator}
              onChange={(v) => onChange?.({ separator: v })}
              placeholder='e.g. "," or " "'
              focusBorderClass="focus:border-sky-500/40"
              typographyClass="text-[11px] px-2 py-1.5 font-mono"
              textColorClass="text-white/80"
            />
          </div>
        )}

        {/* Slice config */}
        {op === "slice" && (
          <div className="space-y-1.5">
            <div className="space-y-1">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">
                Start
              </p>
              <input type="number" value={sliceStart}
                onChange={(e) => onChange?.({ sliceStart: Number(e.target.value) })}
                className={inpCls} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider flex-1">
                  End
                </p>
                <button
                  onClick={() => onChange?.({ sliceEndEnabled: !sliceEndEnabled })}
                  className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors",
                    sliceEndEnabled
                      ? "bg-sky-600/20 border-sky-500/40 text-sky-300"
                      : "border-white/[0.08] text-white/25 hover:text-white/50"
                  )}
                >
                  {sliceEndEnabled ? "on" : "off"}
                </button>
              </div>
              {sliceEndEnabled && (
                <input type="number" value={sliceEnd}
                  onChange={(e) => onChange?.({ sliceEnd: Number(e.target.value) })}
                  className={inpCls} />
              )}
            </div>
          </div>
        )}

        <div className="border-t border-white/[0.06]" />

        {/* Output label */}
        <div ref={outputRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-sky-300/50">
            {op === "split" ? "array" : "string"}
          </span>
        </div>

      </div>
    </div>
  );
}

export const StringOpsNode = memo(StringOpsNodeComponent);
