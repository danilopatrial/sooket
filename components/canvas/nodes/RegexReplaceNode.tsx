"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Replace } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { RegexReplaceNodeData } from "@/lib/node-types";
import type { RegexReplaceNodeData } from "@/lib/node-types";

const SAMPLE = "Hello World 123";
const HANDLE_TOP = 28;

function preview(pattern: string, replace: string, flags: string): { ok: true; result: string } | { ok: false; error: string } {
  if (!pattern) return { ok: true, result: SAMPLE };
  try {
    const re = new RegExp(pattern, flags);
    return { ok: true, result: SAMPLE.replace(re, replace) };
  } catch {
    return { ok: false, error: "Invalid regex" };
  }
}

function RegexReplaceNodeComponent({ data, selected }: NodeProps) {
  const { zoom }    = useViewport();
  const d           = data as unknown as RegexReplaceNodeData;
  const pattern     = d.pattern  ?? "";
  const replace     = d.replace  ?? "";
  const flags       = d.flags    ?? "g";
  const onChange    = d.onChange;
  const connected   = d.connectedHandles ?? [];

  const nodeRef      = useRef<HTMLDivElement>(null);
  const patternRef   = useRef<HTMLDivElement>(null);
  const replaceRef   = useRef<HTMLDivElement>(null);
  const outputRef    = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (el: HTMLElement | null) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      pattern: mid(patternRef.current),
      replace: mid(replaceRef.current),
      output:  mid(outputRef.current),
    });
  }, [zoom]);

  const pv  = preview(pattern, replace, flags);
  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-teal-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-56 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-teal-500/50 shadow-teal-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"   position={Position.Left}  style={{ top: HANDLE_TOP }}        className={dot} />
      <Handle type="target" id="pattern" position={Position.Left}  style={{ top: tops.pattern ?? 0 }} className={dot} />
      <Handle type="target" id="replace" position={Position.Left}  style={{ top: tops.replace ?? 0 }} className={dot} />
      <Handle type="source" id="output"  position={Position.Right} style={{ top: tops.output  ?? 0 }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-teal-700 flex items-center justify-center shrink-0">
          <Replace className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Regex Replace</p>
          <p className="text-[11px] text-teal-300/70 mt-0.5">find &amp; replace with regex</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5 nodrag">

        {/* Pattern */}
        <div className="space-y-1">
          <p className={cn(
            "text-[10px] uppercase tracking-wider",
            connected.includes("pattern") ? "text-teal-300" : "text-white/30"
          )}>
            Pattern
          </p>
          <div ref={patternRef}>
            <VarField
              as="input"
              value={pattern}
              onChange={(v) => onChange?.({ pattern: v })}
              placeholder="e.g. \d+ or [aeiou]"
              focusBorderClass="focus:border-teal-500/40"
              typographyClass="text-[11px] px-2 py-1.5 font-mono"
              textColorClass="text-white/80"
            />
          </div>
        </div>

        {/* Replace */}
        <div className="space-y-1">
          <p className={cn(
            "text-[10px] uppercase tracking-wider",
            connected.includes("replace") ? "text-teal-300" : "text-white/30"
          )}>
            Replace
          </p>
          <div ref={replaceRef}>
            <VarField
              as="input"
              value={replace}
              onChange={(v) => onChange?.({ replace: v })}
              placeholder='e.g. "**" or $1'
              focusBorderClass="focus:border-teal-500/40"
              typographyClass="text-[11px] px-2 py-1.5 font-mono"
              textColorClass="text-white/80"
            />
          </div>
        </div>

        {/* Flags */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Flags</p>
          <input
            value={flags}
            onChange={(e) => onChange?.({ flags: e.target.value })}
            placeholder="g"
            maxLength={6}
            className="w-full rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/80 font-mono focus:outline-none focus:border-teal-500/40 transition-colors placeholder-white/20"
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Live preview */}
        <div className="space-y-0.5">
          <p className="text-[10px] text-white/20 uppercase tracking-wider">Preview</p>
          {pv.ok ? (
            <p className="text-[10px] font-mono text-teal-300/60 truncate" title={pv.result}>{pv.result}</p>
          ) : (
            <p className="text-[10px] font-mono text-rose-400/70">{pv.error}</p>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output row */}
        <div ref={outputRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-teal-300/50">string</span>
        </div>

      </div>
    </div>
  );
}

export const RegexReplaceNode = memo(RegexReplaceNodeComponent);
