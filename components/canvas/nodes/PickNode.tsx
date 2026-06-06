"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { PickNodeData } from "@/lib/node-types";
import type { PickNodeData } from "@/lib/node-types";

function PickNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d         = data as unknown as PickNodeData;
  const key       = d.key ?? "";
  const connected = d.connectedHandles ?? [];
  const onChange  = d.onChange;

  const nodeRef     = useRef<HTMLDivElement>(null);
  const inputRowRef = useRef<HTMLDivElement>(null);
  const keyRowRef   = useRef<HTMLDivElement>(null);
  const outputRowRef = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState({ input: 0, key: 0, output: 0 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({ input: mid(inputRowRef), key: mid(keyRowRef), output: mid(outputRowRef) });
  }, [zoom]);

  const dot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-lime-400";
  const keyDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30";

  const isKeyConnected = connected.includes("key");

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-52 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-lime-500/50 shadow-lime-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top: tops.input  }} className={dot} />
      <Handle type="target" id="key"    position={Position.Left}  style={{ top: tops.key    }} className={keyDot} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: tops.output }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-lime-700 flex items-center justify-center shrink-0">
          <KeyRound className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Pick</p>
          <p className="text-[11px] text-lime-300/70 mt-0.5 font-mono truncate">
            obj[{key ? JSON.stringify(key) : "key"}]
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2 nodrag">

        {/* Object input row */}
        <div ref={inputRowRef} className="flex items-center justify-between h-7">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-lime-300" : "text-white/30"
          )}>object</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Key row */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Key
          </p>
          <div ref={keyRowRef}>
            <VarField
              as="input"
              value={key}
              onChange={(v) => onChange?.({ key: v })}
              placeholder="e.g. email or user.name"
              disabled={isKeyConnected}
              focusBorderClass="focus:border-lime-500/40"
              typographyClass="text-[11px] px-2 py-1.5 font-mono"
              textColorClass="text-white/70"
            />
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output row */}
        <div ref={outputRowRef} className="flex items-center justify-end h-6">
          <span className="text-[11px] font-mono text-lime-300/50">value</span>
        </div>

      </div>
    </div>
  );
}

export const PickNode = memo(PickNodeComponent);
