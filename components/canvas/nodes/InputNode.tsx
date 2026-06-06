"use client";

import { memo, useRef, useState, useLayoutEffect } from "react";
import { Handle, Position, useViewport } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SLOTS = [
  { id: "body",    label: "body",    desc: "parsed JSON" },
  { id: "headers", label: "headers", desc: "request headers" },
  { id: "query",   label: "query",   desc: "query params" },
  { id: "method",  label: "method",  desc: "HTTP method" },
  { id: "raw",     label: "raw",     desc: "body as text" },
  { id: "ip",      label: "ip",      desc: "client IP" },
] as const;

const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400";

function InputNodeComponent({ selected }: NodeProps) {
  const { zoom } = useViewport();
  const nodeRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [tops, setTops] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const next: Record<string, number> = {};
    rowRefs.current.forEach((el, key) => {
      const r = el.getBoundingClientRect();
      next[key] = (r.top + r.height / 2 - nodeTop) / zoom;
    });
    setTops(next);
  }, [zoom]);

  return (
    <div
      ref={nodeRef}
      className={cn(
        "relative rounded-2xl border bg-[#1a1a1c] shadow-2xl w-52 overflow-hidden",
        selected
          ? "border-emerald-500/50 shadow-emerald-900/20 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_0_20px_rgba(16,185,129,0.15)]"
          : "border-white/[0.08]"
      )}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 inset-y-0 w-[3px] bg-emerald-500 rounded-l-xl" />

      {/* Header */}
      <div className="flex items-center gap-3 pl-5 pr-4 py-3">
        <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
          <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Input</p>
          <p className="text-[11px] text-white/35 mt-0.5">API Request</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mx-0" />

      {/* Output slots */}
      <div className="py-1.5">
        {SLOTS.map(({ id, label, desc }) => (
          <div
            key={id}
            ref={(el) => { if (el) rowRefs.current.set(id, el); else rowRefs.current.delete(id); }}
            className="flex items-center justify-between px-4 py-1.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[12px] font-medium text-white/80">{label}</span>
              <span className="text-[10px] text-white/25">{desc}</span>
            </div>
            <Handle
              type="source"
              id={id}
              position={Position.Right}
              style={{ top: tops[id] ?? 0 }}
              className={dot}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const InputNode = memo(InputNodeComponent);
