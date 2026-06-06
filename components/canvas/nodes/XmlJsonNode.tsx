"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
export type { XmlJsonDirection, XmlJsonNodeData } from "@/lib/node-types";
import type { XmlJsonDirection, XmlJsonNodeData } from "@/lib/node-types";






const HANDLE_TOP = 28;

const DIRECTIONS: { value: XmlJsonDirection; label: string; sub: string }[] = [
  { value: "xml-to-json", label: "XML - JSON", sub: "parse XML, emit JSON" },
  { value: "json-to-xml", label: "JSON - XML", sub: "serialize JSON to XML" },
];

function XmlJsonNodeComponent({ data, selected }: NodeProps) {
  const d         = data as unknown as XmlJsonNodeData;
  const direction = d.direction  ?? "xml-to-json";
  const rootEl    = d.rootElement ?? "root";
  const pretty    = d.prettyPrint ?? false;
  const onChange  = d.onChange;

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-orange-400";

  return (
    <div
      className={cn(
        "w-52 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-orange-500/50 shadow-orange-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top: HANDLE_TOP }} className={dot} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: HANDLE_TOP }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-orange-700 flex items-center justify-center shrink-0">
          <FileCode2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">XML ↔ JSON</p>
          <p className="text-[11px] text-orange-300/70 mt-0.5 font-mono">
            {direction === "xml-to-json" ? "xml - json" : "json - xml"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">
        {/* Direction toggle */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Direction</p>
          {DIRECTIONS.map((dir) => (
            <button
              key={dir.value}
              onClick={() => onChange?.({ direction: dir.value })}
              className={cn(
                "w-full py-1.5 px-3 rounded-lg border text-left transition-colors",
                direction === dir.value
                  ? "bg-orange-600/30 border-orange-500/50 text-orange-300"
                  : "bg-[#252527] border-white/[0.08] text-white/30 hover:text-white/60"
              )}
            >
              <span className="text-[11px] font-mono font-semibold leading-none block">{dir.label}</span>
              <span className="text-[9px] leading-none mt-0.5 block opacity-60">{dir.sub}</span>
            </button>
          ))}
        </div>

        {/* Root element (only relevant for json-to-xml) */}
        {direction === "json-to-xml" && (
          <div className="space-y-1">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Root Element</p>
            <input
              type="text"
              value={rootEl}
              onChange={(e) => onChange?.({ rootElement: e.target.value })}
              placeholder="root"
              className="w-full bg-[#252527] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] font-mono text-white/80 focus:outline-none focus:border-orange-500/50"
            />
          </div>
        )}

        {/* Pretty-print toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Pretty Print</span>
          <button
            onClick={() => onChange?.({ prettyPrint: !pretty })}
            className={cn(
              "relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 transition-colors",
              pretty ? "bg-orange-600 border-orange-500" : "bg-[#252527] border-white/[0.08]"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform",
                pretty ? "translate-x-3" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export const XmlJsonNode = memo(XmlJsonNodeComponent);
