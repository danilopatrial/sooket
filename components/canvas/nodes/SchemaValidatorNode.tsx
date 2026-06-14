"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { FileCheck2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextExpandModal } from "@/components/canvas/TextExpandModal";
export type { SchemaValidatorNodeData } from "@/lib/node-types";
import type { SchemaValidatorNodeData } from "@/lib/node-types";

type Tops = { input: number; valid: number; invalid: number };

const SCHEMA_PLACEHOLDER = `{
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": { "type": "string", "pattern": "^[^@]+@[^@]+$" }
  }
}`;

function SchemaValidatorNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d = data as unknown as SchemaValidatorNodeData;
  const connected = d.connectedHandles ?? [];
  const schema = d.schema ?? "";
  const action = d.action ?? "block";

  const nodeRef = useRef<HTMLDivElement>(null);
  const inputRowRef = useRef<HTMLDivElement>(null);
  const validRowRef = useRef<HTMLDivElement>(null);
  const invalidRowRef = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState<Tops>({ input: 56, valid: 56, invalid: 80 });
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({ input: mid(inputRowRef), valid: mid(validRowRef), invalid: mid(invalidRowRef) });
  }, [zoom, action]);

  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-teal-400";
  const invalidHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-teal-500/50 shadow-teal-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"   position={Position.Left}  style={{ top: tops.input }}   className={mainHandle} />
      <Handle type="source" id="valid"   position={Position.Right} style={{ top: tops.valid }}   className={mainHandle} />
      <Handle type="source" id="invalid" position={Position.Right} style={{ top: tops.invalid }} className={invalidHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-teal-700 flex items-center justify-center shrink-0">
          <FileCheck2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Schema Validator</p>
          <p className="text-[11px] text-teal-300/70 mt-0.5 font-mono truncate">
            JSON Schema · {action === "block" ? "block" : "pass"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 nodrag">
        {/* input row */}
        <div ref={inputRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-teal-300" : "text-white/30"
          )}>
            input
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">any</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* schema editor */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            JSON Schema
          </label>
          <div className="relative">
            <textarea
              value={schema}
              placeholder={SCHEMA_PLACEHOLDER}
              rows={6}
              onChange={(e) => d.onChange?.({ schema: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5
                         text-[11px] text-white/80 placeholder:text-white/20 resize-none
                         focus:outline-none focus:border-teal-500/50 font-mono leading-relaxed"
            />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute top-1.5 right-1.5 p-0.5 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
              tabIndex={-1}
              title="Expand editor"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
          <TextExpandModal
            open={expanded}
            onOpenChange={setExpanded}
            value={schema}
            onChange={(v) => d.onChange?.({ schema: v })}
            title="JSON Schema"
            placeholder={SCHEMA_PLACEHOLDER}
          />
        </div>

        {/* action */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            On Invalid
          </label>
          <select
            value={action}
            onChange={(e) => d.onChange?.({ action: e.target.value as "block" | "pass" })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-teal-500/50"
          >
            <option value="block">Block (reject)</option>
            <option value="pass">Pass input through</option>
          </select>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* valid output row */}
        <div ref={validRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">value</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-300/70">
            valid
          </span>
        </div>

        {/* invalid output row */}
        <div ref={invalidRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">errors</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-300/70">
            invalid
          </span>
        </div>
      </div>
    </div>
  );
}

export const SchemaValidatorNode = memo(SchemaValidatorNodeComponent);
