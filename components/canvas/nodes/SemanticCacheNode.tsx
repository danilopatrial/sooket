"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

export type { SemanticCacheNodeData } from "@/lib/node-types";
import type { SemanticCacheNodeData } from "@/lib/node-types";

type Tops = { key: number; value: number; output: number; hit: number };

function SemanticCacheNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d         = data as unknown as SemanticCacheNodeData;
  const connected = d.connectedHandles ?? [];
  const ttl       = d.ttl       ?? 3600;
  const threshold = d.threshold ?? 0.85;

  const nodeRef     = useRef<HTMLDivElement>(null);
  const keyRowRef   = useRef<HTMLDivElement>(null);
  const valueRowRef = useRef<HTMLDivElement>(null);
  const outRowRef   = useRef<HTMLDivElement>(null);
  const hitRowRef   = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState<Tops>({ key: 56, value: 80, output: 56, hit: 80 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      key:    mid(keyRowRef),
      value:  mid(valueRowRef),
      output: mid(outRowRef),
      hit:    mid(hitRowRef),
    });
  }, [zoom]);

  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";
  const hitHandle  = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";

  function formatTtl(s: number): string {
    if (s >= 3600) return `${s / 3600}h TTL`;
    if (s >= 60)   return `${s / 60}m TTL`;
    return `${s}s TTL`;
  }

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-56 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-violet-500/50 shadow-violet-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="key"    position={Position.Left}  style={{ top: tops.key }}    className={mainHandle} />
      <Handle type="target" id="value"  position={Position.Left}  style={{ top: tops.value }}  className={mainHandle} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: tops.output }} className={mainHandle} />
      <Handle type="source" id="hit"    position={Position.Right} style={{ top: tops.hit }}    className={hitHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-violet-700 flex items-center justify-center shrink-0">
          <BrainCircuit className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Semantic Cache</p>
          <p className="text-[11px] text-violet-300/70 mt-0.5 font-mono truncate">
            {formatTtl(ttl)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 nodrag">

        {/* key input row */}
        <div ref={keyRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("key") ? "text-violet-300" : "text-white/30"
          )}>
            key
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">text</span>
        </div>

        {/* value input row */}
        <div ref={valueRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("value") ? "text-violet-300" : "text-white/30"
          )}>
            value
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">lazy</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* TTL config */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            TTL (seconds)
          </label>
          <input
            type="number"
            min={1}
            value={ttl}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) d.onChange?.({ ttl: v });
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Threshold config */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Similarity threshold — {threshold.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={threshold}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) d.onChange?.({ threshold: v });
            }}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-[9px] text-white/20 font-mono">
            <span>loose</span>
            <span>strict</span>
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* output row */}
        <div ref={outRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">value</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-violet-300/70">
            output
          </span>
        </div>

        {/* hit row */}
        <div ref={hitRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">bool</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-300/70">
            hit
          </span>
        </div>

      </div>
    </div>
  );
}

export const SemanticCacheNode = memo(SemanticCacheNodeComponent);
