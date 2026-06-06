"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
export type { BackoffStrategy, RetryNodeData } from "@/lib/node-types";
import type { BackoffStrategy, RetryNodeData } from "@/lib/node-types";






type Tops = { input: number; output: number; failed: number };

function RetryNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d           = data as unknown as RetryNodeData;
  const connected   = d.connectedHandles ?? [];
  const maxAttempts = d.maxAttempts ?? 3;
  const backoff     = d.backoff ?? "exponential";
  const baseDelayMs = d.baseDelayMs ?? 1000;
  const maxDelayMs  = d.maxDelayMs ?? 30000;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const inputRowRef  = useRef<HTMLDivElement>(null);
  const outputRowRef = useRef<HTMLDivElement>(null);
  const failedRowRef = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState<Tops>({ input: 56, output: 56, failed: 80 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      input:  mid(inputRowRef),
      output: mid(outputRowRef),
      failed: mid(failedRowRef),
    });
  }, [zoom, maxAttempts, backoff, baseDelayMs]);

  const mainHandle   = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";
  const failedHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";

  function formatDelay(ms: number): string {
    if (ms >= 1000) return `${ms / 1000}s`;
    return `${ms}ms`;
  }

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-amber-500/50 shadow-amber-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle
        type="target"
        id="input"
        position={Position.Left}
        style={{ top: tops.input }}
        className={mainHandle}
      />
      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ top: tops.output }}
        className={mainHandle}
      />
      <Handle
        type="source"
        id="failed"
        position={Position.Right}
        style={{ top: tops.failed }}
        className={failedHandle}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-amber-700 flex items-center justify-center shrink-0">
          <RotateCcw className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Retry</p>
          <p className="text-[11px] text-amber-300/70 mt-0.5 font-mono truncate">
            {maxAttempts}× · {backoff} · {formatDelay(baseDelayMs)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 nodrag">

        {/* input row */}
        <div ref={inputRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-amber-300" : "text-white/30"
          )}>
            input
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">upstream</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* max attempts */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Max Attempts
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={maxAttempts}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1 && v <= 10) d.onChange?.({ maxAttempts: v });
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* backoff strategy */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Backoff
          </label>
          <select
            value={backoff}
            onChange={(e) => d.onChange?.({ backoff: e.target.value as BackoffStrategy })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-amber-500/50"
          >
            <option value="none">None (constant)</option>
            <option value="linear">Linear</option>
            <option value="exponential">Exponential</option>
          </select>
        </div>

        {/* base delay */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Base Delay (ms)
          </label>
          <input
            type="number"
            min={0}
            max={30000}
            step={100}
            value={baseDelayMs}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 0 && v <= 30000) d.onChange?.({ baseDelayMs: v });
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* max delay cap */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Max Delay (ms)
          </label>
          <input
            type="number"
            min={100}
            max={300000}
            step={1000}
            value={maxDelayMs}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 100 && v <= 300000) d.onChange?.({ maxDelayMs: v });
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-amber-500/50"
          />
          <p className="text-[9px] text-white/15">caps each backoff delay</p>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* output row */}
        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">value</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-300/70">
            output
          </span>
        </div>

        {/* failed row */}
        <div ref={failedRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">string</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-300/70">
            failed
          </span>
        </div>

      </div>
    </div>
  );
}

export const RetryNode = memo(RetryNodeComponent);
