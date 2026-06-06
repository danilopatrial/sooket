"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { IfOperator, IfNodeData } from "@/lib/node-types";
import type { IfOperator, IfNodeData } from "@/lib/node-types";

const OPERATORS: { value: IfOperator; label: string; group: string }[] = [
  { value: "==",         label: "== equals",        group: "Equality" },
  { value: "!=",         label: "!= not equals",    group: "Equality" },
  { value: ">",          label: ">  greater than",  group: "Numeric"  },
  { value: "<",          label: "<  less than",      group: "Numeric"  },
  { value: ">=",         label: ">= at least",      group: "Numeric"  },
  { value: "<=",         label: "<= at most",       group: "Numeric"  },
  { value: "contains",   label: "contains",         group: "String"   },
  { value: "startsWith", label: "starts with",      group: "String"   },
  { value: "endsWith",   label: "ends with",        group: "String"   },
  { value: "isEmpty",    label: "is empty / null",  group: "Check"    },
  { value: "isTruthy",   label: "is truthy / set",  group: "Check"    },
];

const UNARY = new Set<IfOperator>(["isEmpty", "isTruthy"]);

function IfNodeComponent({ data, selected }: NodeProps) {
  const { zoom }   = useViewport();
  const d          = data as unknown as IfNodeData;
  const operator   = d.operator  ?? "==";
  const compareTo  = d.compareTo ?? "";
  const connected  = d.connectedHandles ?? [];
  const onChange   = d.onChange;

  const isUnary            = UNARY.has(operator);
  const isCompareConnected = connected.includes("compare");

  const nodeRef     = useRef<HTMLDivElement>(null);
  const inputRowRef = useRef<HTMLDivElement>(null);
  const cmpRowRef   = useRef<HTMLDivElement>(null);
  const dataRowRef  = useRef<HTMLDivElement>(null);
  const trueRowRef  = useRef<HTMLDivElement>(null);
  const falseRowRef = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState({ input: 0, compare: 0, data: 0, true: 0, false: 0 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      input:   mid(inputRowRef),
      compare: isUnary ? 0 : mid(cmpRowRef),
      data:    mid(dataRowRef),
      true:    mid(trueRowRef),
      false:   mid(falseRowRef),
    });
  }, [operator, zoom, isUnary]);

  const inputDot   = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-orange-400";
  const compareDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30";
  const dataDot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-sky-400";
  const trueDot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400";
  const falseDot   = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-56 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-orange-500/50 shadow-orange-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"   position={Position.Left} style={{ top: tops.input   }} className={inputDot}   />
      {!isUnary && (
        <Handle type="target" id="compare" position={Position.Left} style={{ top: tops.compare }} className={compareDot} />
      )}
      <Handle type="target" id="data"    position={Position.Left} style={{ top: tops.data    }} className={dataDot}    />

      <Handle type="source" id="true"  position={Position.Right} style={{ top: tops.true  }} className={trueDot}  />
      <Handle type="source" id="false" position={Position.Right} style={{ top: tops.false }} className={falseDot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
          <GitBranch className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">If</p>
          <p className="text-[11px] text-orange-300/70 mt-0.5">split flow on a condition</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2 nodrag">

        {/* Input row */}
        <div ref={inputRowRef} className="flex items-center justify-between h-7">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-orange-300" : "text-white/30"
          )}>value</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Condition / Operator */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Condition
          </p>
          <select
            value={operator}
            onChange={(e) => onChange?.({ operator: e.target.value as IfOperator })}
            className="w-full rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/70 font-mono focus:outline-none focus:border-orange-500/40 transition-colors"
          >
            {["Equality", "Numeric", "String", "Check"].map((group) => (
              <optgroup key={group} label={group}>
                {OPERATORS.filter((o) => o.group === group).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Compare-to row */}
        {!isUnary && (
          <div className="space-y-1">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              Compare To
            </p>
            <div ref={cmpRowRef}>
              <VarField
                as="input"
                value={compareTo}
                onChange={(v) => onChange?.({ compareTo: v })}
                placeholder="value to match against…"
                disabled={isCompareConnected}
                focusBorderClass="focus:border-orange-500/40"
                typographyClass="text-[11px] px-2 py-1.5 font-mono"
                textColorClass="text-white/70"
              />
            </div>
            {isCompareConnected && (
              <p className="text-[9px] text-white/20">using connected value</p>
            )}
          </div>
        )}

        {/* Data passthrough row */}
        <div ref={dataRowRef} className="flex items-center justify-between h-7">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("data") ? "text-sky-300" : "text-white/30"
          )}>data</span>
          {connected.includes("data") && (
            <span className="text-[9px] text-sky-400/50">pass-through</span>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output rows */}
        <div ref={trueRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-emerald-400/70">true</span>
        </div>
        <div ref={falseRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-rose-400/70">false</span>
        </div>

      </div>
    </div>
  );
}

export const IfNode = memo(IfNodeComponent);
