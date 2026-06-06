"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
export type { AccessListMode, AccessListNodeData } from "@/lib/node-types";
import type { AccessListNodeData } from "@/lib/node-types";






function AccessListNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d = data as unknown as AccessListNodeData;
  const mode = d.mode ?? "whitelist";
  const onChange = d.onChange;

  const nodeRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLDivElement>(null);
  const passRef    = useRef<HTMLDivElement>(null);
  const blockRef   = useRef<HTMLDivElement>(null);
  const matchRef   = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState({ input: 0, pass: 0, block: 0, match: 0 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({ input: mid(inputRef), pass: mid(passRef), block: mid(blockRef), match: mid(matchRef) });
  }, [mode, zoom]);

  const isWhitelist = mode === "whitelist";

  const inputDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";
  const passDot  = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400";
  const blockDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";
  const matchDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-sky-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-72 rounded-2xl shadow-2xl border bg-[#1a1a1c] transition-shadow",
        selected ? "border-amber-500/50 shadow-amber-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input" position={Position.Left}  style={{ top: tops.input }} className={inputDot} />
      <Handle type="source" id="pass"  position={Position.Right} style={{ top: tops.pass  }} className={passDot}  />
      <Handle type="source" id="block" position={Position.Right} style={{ top: tops.block }} className={blockDot} />
      <Handle type="source" id="match" position={Position.Right} style={{ top: tops.match }} className={matchDot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Access List</p>
          <p className="text-[11px] text-amber-300/70 mt-0.5">filter by stored values</p>
        </div>
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
          isWhitelist ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
        )}>
          {isWhitelist ? "allow" : "deny"}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2.5 nodrag">

        {/* Mode toggle */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Mode</p>
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[11px]">
            {(["whitelist", "blacklist"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChange?.({ mode: m })}
                className={cn(
                  "flex-1 py-1.5 font-medium transition-colors capitalize",
                  mode === m
                    ? m === "whitelist"
                      ? "bg-emerald-600/30 text-emerald-300"
                      : "bg-rose-600/30 text-rose-300"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Input row */}
        <div ref={inputRef} className="flex items-center h-6">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30">value</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output rows */}
        <div ref={passRef} className="flex items-center justify-between h-6">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30">pass</span>
          <span className="text-[9px] text-emerald-400/50">{isWhitelist ? "in list" : "not in list"}</span>
        </div>
        <div ref={blockRef} className="flex items-center justify-between h-6">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30">block</span>
          <span className="text-[9px] text-rose-400/50">{isWhitelist ? "not in list" : "in list"}</span>
        </div>
        <div ref={matchRef} className="flex items-center justify-between h-6">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30">match</span>
          <span className="text-[9px] text-sky-400/50">boolean</span>
        </div>

      </div>
    </div>
  );
}

export const AccessListNode = memo(AccessListNodeComponent);
