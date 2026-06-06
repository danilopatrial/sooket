"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { cn } from "@/lib/utils";
export type { MathOperator, MathNodeData } from "@/lib/node-types";
import type { MathOperator, MathNodeData } from "@/lib/node-types";






const OPS: { value: MathOperator; label: string; hint: string }[] = [
  { value: "+",   label: "+",   hint: "add"      },
  { value: "-",   label: "−",   hint: "subtract" },
  { value: "*",   label: "×",   hint: "multiply" },
  { value: "/",   label: "÷",   hint: "divide"   },
  { value: "%",   label: "%",   hint: "mod"      },
  { value: "**",  label: "xⁿ",  hint: "power"   },
  { value: "min", label: "min", hint: "min"      },
  { value: "max", label: "max", hint: "max"      },
  { value: "abs", label: "|a|", hint: "abs"      },
];

function preview(op: MathOperator, a: number, b: number): string {
  switch (op) {
    case "+":   return String(a + b);
    case "-":   return String(a - b);
    case "*":   return String(a * b);
    case "/":   return b === 0 ? "÷0 err" : String(a / b);
    case "%":   return b === 0 ? "%0 err"  : String(a % b);
    case "**":  return String(a ** b);
    case "min": return String(Math.min(a, b));
    case "max": return String(Math.max(a, b));
    case "abs": return String(Math.abs(a));
  }
}

function MathNodeComponent({ data, selected }: NodeProps) {
  const { zoom }   = useViewport();
  const d          = data as unknown as MathNodeData;
  const operator   = d.operator  ?? "+";
  const defaultA   = d.defaultA  ?? 0;
  const defaultB   = d.defaultB  ?? 0;
  const connected  = d.connectedHandles ?? [];
  const onChange   = d.onChange;

  const isAConnected  = connected.includes("a");
  const isBConnected  = connected.includes("b");
  const isUnary       = operator === "abs";

  const nodeRef   = useRef<HTMLDivElement>(null);
  const aRowRef   = useRef<HTMLDivElement>(null);
  const bRowRef   = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState({ a: 0, b: 0, result: 0 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({ a: mid(aRowRef), b: mid(bRowRef), result: mid(resultRef) });
  }, [zoom]);

  const dot      = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-purple-400";
  const inputDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30";
  const inputCls = "w-full rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/80 font-mono focus:outline-none focus:border-purple-500/40 transition-colors";

  const showPreview = !isAConnected && !isBConnected;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-52 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-purple-500/50 shadow-purple-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="a" position={Position.Left} style={{ top: tops.a }} className={inputDot} />
      <Handle type="target" id="b" position={Position.Left} style={{ top: tops.b }} className={inputDot} />
      <Handle type="source" id="result" position={Position.Right} style={{ top: tops.result }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-purple-700 flex items-center justify-center text-white font-bold shrink-0 font-mono select-none">
          <span className={cn((OPS.find((o) => o.value === operator)?.label.length ?? 1) > 1 ? "text-[9px]" : "text-base")}>
            {OPS.find((o) => o.value === operator)?.label ?? "+"}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Math</p>
          <p className="text-[11px] text-purple-300/70 mt-0.5 font-mono">
            {showPreview ? `= ${preview(operator, defaultA, defaultB)}` : "numeric operation"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2 nodrag">

        {/* A row */}
        <div className="space-y-1">
          <p className={cn("text-[10px] font-mono font-bold leading-none px-1", isAConnected ? "text-white/60" : "text-white/25")}>A</p>
          <div ref={aRowRef} className={cn(isAConnected && "opacity-30 pointer-events-none")}>
            <input
              type="number"
              value={defaultA}
              onChange={(e) => onChange?.({ defaultA: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
        </div>

        {/* Operator selector — row 1: binary basics, row 2: extras */}
        {[OPS.slice(0, 4), OPS.slice(4)].map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((op) => (
              <button
                key={op.value}
                onClick={() => onChange?.({ operator: op.value })}
                className={cn(
                  "flex-1 rounded-md border transition-colors",
                  operator === op.value
                    ? "bg-purple-600/30 border-purple-500/50 text-purple-300"
                    : "bg-[#252527] border-white/[0.08] text-white/30 hover:text-white/60"
                )}
              >
                <p className="text-[11px] font-mono font-bold py-1.5 leading-none">{op.label}</p>
              </button>
            ))}
          </div>
        ))}

        {/* B row — hidden for unary operators */}
        <div className={cn("space-y-1", isUnary && "opacity-20 pointer-events-none")}>
          <p className={cn("text-[10px] font-mono font-bold leading-none px-1", isBConnected ? "text-white/60" : "text-white/25")}>B</p>
          <div ref={bRowRef} className={cn((isBConnected || isUnary) && "opacity-30 pointer-events-none")}>
            <input
              type="number"
              value={defaultB}
              onChange={(e) => onChange?.({ defaultB: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Result row */}
        <div ref={resultRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-purple-300/60">result</span>
        </div>

      </div>
    </div>
  );
}

export const MathNode = memo(MathNodeComponent);
