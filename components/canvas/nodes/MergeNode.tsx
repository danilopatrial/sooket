"use client";

import { memo, useRef, useLayoutEffect, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Merge } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { MergeNodeData } from "@/lib/node-types";
import type { MergeNodeData } from "@/lib/node-types";

const MIN_INPUTS = 2;
const MAX_INPUTS = 8;

const MODES: { value: MergeNodeData["mode"]; label: string }[] = [
  { value: "first",  label: "First" },
  { value: "join",   label: "Join"  },
  { value: "object", label: "Object"},
];

function MergeNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d          = data as unknown as MergeNodeData;
  const mode       = d.mode       ?? "first";
  const inputCount = Math.max(MIN_INPUTS, d.inputCount ?? MIN_INPUTS);
  const separator  = d.separator  ?? "";
  const slotKeys   = d.slotKeys   ?? Array.from({ length: inputCount }, (_, i) => `field${i}`);
  const connected  = d.connectedHandles ?? [];
  const onChange   = d.onChange;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const rowRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const outputRowRef = useRef<HTMLDivElement>(null);
  const [tops, setTops]       = useState<number[]>([]);
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
  }, [zoom, inputCount, mode]);

  const setRowRef = useCallback((i: number) => (el: HTMLDivElement | null) => {
    rowRefs.current[i] = el;
  }, []);

  const handleAddInput = () => {
    if (inputCount >= MAX_INPUTS) return;
    const newCount = inputCount + 1;
    const newKeys = [...slotKeys, `field${newCount - 1}`];
    onChange?.({ inputCount: newCount, slotKeys: newKeys });
  };

  const handleRemoveInput = () => {
    if (inputCount <= MIN_INPUTS) return;
    const newCount = inputCount - 1;
    const newKeys = slotKeys.slice(0, newCount);
    onChange?.({ inputCount: newCount, slotKeys: newKeys });
  };

  const handleKeyChange = (i: number, key: string) => {
    const newKeys = [...slotKeys];
    newKeys[i] = key;
    onChange?.({ slotKeys: newKeys });
  };

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400";

  const modeLabel = mode === "first" ? "first active" : mode === "join" ? `join ${inputCount}` : `object (${inputCount})`;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-56 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-emerald-500/50 shadow-emerald-900/20" : "border-white/[0.08]"
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
        <div className="h-8 w-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
          <Merge className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Merge</p>
          <p className="text-[11px] text-emerald-300/70 mt-0.5 font-mono truncate">
            {modeLabel}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1.5 nodrag">

        {/* Mode selector */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Mode</p>
          <div className="grid grid-cols-3 gap-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => onChange?.({ mode: m.value })}
                className={cn(
                  "rounded-lg border py-1 px-1 text-center transition-colors",
                  mode === m.value
                    ? "bg-emerald-600/30 border-emerald-500/50"
                    : "bg-[#252527] border-white/[0.08] hover:border-white/20"
                )}
              >
                <p className="text-[10px] font-semibold text-white/80 leading-none">{m.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Join mode: separator */}
        {mode === "join" && (
          <div className="space-y-1">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Separator</p>
            <VarField
              as="input"
              value={separator}
              onChange={(v) => onChange?.({ separator: v })}
              placeholder='e.g. ", " or " "'
              focusBorderClass="focus:border-emerald-500/40"
              typographyClass="text-[11px] px-2 py-1.5 font-mono"
              textColorClass="text-white/70"
            />
          </div>
        )}

        <div className="border-t border-white/[0.06]" />

        {/* Input rows */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Inputs</p>
            <div className="flex gap-1">
              <button
                onClick={handleRemoveInput}
                disabled={inputCount <= MIN_INPUTS}
                aria-label="remove input"
                className="p-0.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
              >
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="2" y1="6" x2="10" y2="6" />
                </svg>
              </button>
              <button
                onClick={handleAddInput}
                disabled={inputCount >= MAX_INPUTS}
                aria-label="add input"
                className="p-0.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
              >
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="6" y1="2" x2="6" y2="10" />
                  <line x1="2" y1="6" x2="10" y2="6" />
                </svg>
              </button>
            </div>
          </div>

          {Array.from({ length: inputCount }).map((_, i) => (
            <div
              key={i}
              ref={setRowRef(i)}
              className="flex items-center gap-1.5 h-7"
            >
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-semibold w-3 shrink-0",
                connected.includes(`input-${i}`) ? "text-emerald-300" : "text-white/30"
              )}>
                {i + 1}
              </span>

              {mode === "object" ? (
                <input
                  type="text"
                  value={slotKeys[i] ?? `field${i}`}
                  onChange={(e) => handleKeyChange(i, e.target.value)}
                  placeholder={`field${i}`}
                  aria-label={`key for input ${i}`}
                  className={cn(
                    "flex-1 min-w-0 bg-[#252527] border border-white/[0.08] rounded text-[10px] font-mono",
                    "px-1.5 py-0.5 text-white/70 placeholder-white/20",
                    "focus:outline-none focus:border-emerald-500/40 transition-colors"
                  )}
                />
              ) : (
                <span className="text-[10px] text-white/20 font-mono ml-auto">
                  {mode === "join" ? "string" : "any"}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output row */}
        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-emerald-300/50">output</span>
        </div>

      </div>
    </div>
  );
}

export const MergeNode = memo(MergeNodeComponent);
