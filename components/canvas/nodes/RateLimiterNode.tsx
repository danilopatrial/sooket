"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

export type { RateLimiterNodeData } from "@/lib/node-types";
import type { RateLimiterNodeData } from "@/lib/node-types";

type Tops = { input: number; key: number; output: number; blocked: number };

function RateLimiterNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d           = data as unknown as RateLimiterNodeData;
  const connected   = d.connectedHandles ?? [];
  const keySource   = d.keySource     ?? "ip";
  const window_     = d.windowSeconds ?? 60;
  const limit       = d.limit         ?? 100;
  const action      = d.action        ?? "block";
  const delayMs     = d.delayMs       ?? 1000;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const inputRowRef  = useRef<HTMLDivElement>(null);
  const keyRowRef    = useRef<HTMLDivElement>(null);
  const outputRowRef = useRef<HTMLDivElement>(null);
  const blockedRowRef = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState<Tops>({ input: 56, key: 80, output: 56, blocked: 80 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      input:   mid(inputRowRef),
      key:     mid(keyRowRef),
      output:  mid(outputRowRef),
      blocked: mid(blockedRowRef),
    });
  }, [zoom, keySource, action]);

  const mainHandle    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-orange-400";
  const blockedHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";
  const keyHandle     = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-orange-400";

  function formatWindow(s: number): string {
    if (s >= 3600) return `${s / 3600}h`;
    if (s >= 60)   return `${s / 60}m`;
    return `${s}s`;
  }

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-60 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-orange-500/50 shadow-orange-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input" position={Position.Left}  style={{ top: tops.input }}   className={mainHandle} />
      <Handle type="target" id="key"   position={Position.Left}  style={{ top: tops.key }}     className={keyHandle} />
      <Handle type="source" id="output"  position={Position.Right} style={{ top: tops.output }}  className={mainHandle} />
      <Handle type="source" id="blocked" position={Position.Right} style={{ top: tops.blocked }} className={blockedHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-orange-700 flex items-center justify-center shrink-0">
          <Gauge className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Rate Limiter</p>
          <p className="text-[11px] text-orange-300/70 mt-0.5 font-mono truncate">
            {limit} req / {formatWindow(window_)} · {action}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 nodrag">

        {/* input row */}
        <div ref={inputRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-orange-300" : "text-white/30"
          )}>
            input
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">any</span>
        </div>

        {/* key row — only relevant when keySource === custom */}
        <div ref={keyRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            keySource === "custom"
              ? connected.includes("key") ? "text-orange-300" : "text-white/30"
              : "text-white/15"
          )}>
            key
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">
            {keySource === "custom" ? "string" : "—"}
          </span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* key source */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Key Source
          </label>
          <select
            value={keySource}
            onChange={(e) => d.onChange?.({ keySource: e.target.value as RateLimiterNodeData["keySource"] })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-orange-500/50"
          >
            <option value="ip">IP address</option>
            <option value="workflow">Workflow (global)</option>
            <option value="custom">Custom (key input)</option>
          </select>
        </div>

        {/* window */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Window (seconds)
          </label>
          <input
            type="number"
            min={1}
            value={window_}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) d.onChange?.({ windowSeconds: v });
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-orange-500/50"
          />
        </div>

        {/* limit */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Max Requests
          </label>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) d.onChange?.({ limit: v });
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-orange-500/50"
          />
        </div>

        {/* action */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            On Breach
          </label>
          <select
            value={action}
            onChange={(e) => d.onChange?.({ action: e.target.value as RateLimiterNodeData["action"] })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-orange-500/50"
          >
            <option value="block">Block (active: false)</option>
            <option value="delay">Delay then pass</option>
          </select>
        </div>

        {/* delay ms — only shown when action === delay */}
        {action === "delay" && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
              Delay (ms)
            </label>
            <input
              type="number"
              min={0}
              max={30000}
              step={100}
              value={delayMs}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 0) d.onChange?.({ delayMs: v });
              }}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                         text-[12px] text-white/80 focus:outline-none focus:border-orange-500/50"
            />
          </div>
        )}

        <div className="border-t border-white/[0.06]" />

        {/* output row */}
        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">value</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-300/70">
            output
          </span>
        </div>

        {/* blocked row */}
        <div ref={blockedRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">string</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-300/70">
            blocked
          </span>
        </div>

      </div>
    </div>
  );
}

export const RateLimiterNode = memo(RateLimiterNodeComponent);
