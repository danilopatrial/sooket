"use client";

import { memo, useRef, useLayoutEffect, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Link2, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { ConcatNodeData } from "@/lib/node-types";
import type { ConcatNodeData } from "@/lib/node-types";

const MIN_INPUTS = 2;
const MAX_INPUTS = 8;

function ConcatNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d          = data as unknown as ConcatNodeData;
  const separator  = d.separator  ?? "";
  const inputCount = Math.max(MIN_INPUTS, d.inputCount ?? MIN_INPUTS);
  const connected  = d.connectedHandles ?? [];
  const onChange   = d.onChange;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const rowRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const outputRowRef = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState<number[]>([]);
  const [outputTop, setOutputTop] = useState(0);

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (el: HTMLElement | null) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops(rowRefs.current.map((el) => mid(el)));
    setOutputTop(mid(outputRowRef.current));
  }, [zoom, inputCount]);

  const setRowRef = useCallback((i: number) => (el: HTMLDivElement | null) => {
    rowRefs.current[i] = el;
  }, []);

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-pink-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-52 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-pink-500/50 shadow-pink-900/20" : "border-white/[0.08]"
      )}
    >
      {Array.from({ length: inputCount }).map((_, i) => (
        <Handle
          key={i}
          type="target"
          id={`input-${i}`}
          position={Position.Left}
          style={{ top: tops[i] ?? 0 }}
          className={dot}
        />
      ))}
      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ top: outputTop }}
        className={dot}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-pink-700 flex items-center justify-center shrink-0">
          <Link2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Concat</p>
          <p className="text-[11px] text-pink-300/70 mt-0.5 font-mono truncate">
            join {inputCount} strings
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1.5 nodrag">

        {/* Separator */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Separator
          </p>
          <VarField
            as="input"
            value={separator}
            onChange={(v) => onChange?.({ separator: v })}
            placeholder='e.g. ", " or " "'
            focusBorderClass="focus:border-pink-500/40"
            typographyClass="text-[11px] px-2 py-1.5 font-mono"
            textColorClass="text-white/70"
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Input rows */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              Inputs
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => onChange?.({ inputCount: Math.max(MIN_INPUTS, inputCount - 1) })}
                disabled={inputCount <= MIN_INPUTS}
                className="p-0.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                onClick={() => onChange?.({ inputCount: Math.min(MAX_INPUTS, inputCount + 1) })}
                disabled={inputCount >= MAX_INPUTS}
                className="p-0.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {Array.from({ length: inputCount }).map((_, i) => (
            <div
              key={i}
              ref={setRowRef(i)}
              className="flex items-center justify-between h-7"
            >
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-semibold",
                connected.includes(`input-${i}`) ? "text-pink-300" : "text-white/30"
              )}>
                {i + 1}
              </span>
              <span className="text-[10px] text-white/20 font-mono">string</span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output row */}
        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-pink-300/50">output</span>
        </div>

      </div>
    </div>
  );
}

export const ConcatNode = memo(ConcatNodeComponent);
