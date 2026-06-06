"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { PromptCompressionNodeData } from "@/lib/node-types";
import type { PromptCompressionNodeData } from "@/lib/node-types";


export const DEFAULT_COMPRESSION_PROMPT =
  "Summarize the following concisely, preserving all key information:";



const HANDLE_TOP = 28;
type Tops = { input: number; output: number };

function PromptCompressionNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d                = data as unknown as PromptCompressionNodeData;
  const compressionPrompt = d.compressionPrompt ?? DEFAULT_COMPRESSION_PROMPT;
  const targetWords       = d.targetWords       ?? null;
  const onChange          = d.onChange;
  const connected         = d.connectedHandles  ?? [];

  const nodeRef      = useRef<HTMLDivElement>(null);
  const inputRowRef  = useRef<HTMLDivElement>(null);
  const outputRowRef = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState<Tops>({ input: HANDLE_TOP, output: HANDLE_TOP });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({ input: mid(inputRowRef), output: mid(outputRowRef) });
  }, [zoom, compressionPrompt, targetWords]);

  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-violet-500/50 shadow-violet-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top: tops.input }}  className={mainHandle} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: tops.output }} className={mainHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
          <Minimize2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Prompt Compression</p>
          <p className="text-[11px] text-violet-300/70 mt-0.5 truncate">compress via Haiku · saves tokens</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 nodrag">

        {/* Input row */}
        <div ref={inputRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-violet-300" : "text-white/30"
          )}>
            input
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">text</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Compression Prompt */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Compression Prompt
          </label>
          <VarField
            as="textarea"
            value={compressionPrompt}
            onChange={(v) => onChange?.({ compressionPrompt: v })}
            rows={3}
            placeholder={DEFAULT_COMPRESSION_PROMPT}
            focusBorderClass="focus:border-violet-500/40"
            typographyClass="text-[11px] px-2.5 py-2"
            textColorClass="text-white/80"
            expandTitle="Compression Prompt"
          />
        </div>

        {/* Target Words */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Target Words{" "}
            <span className="normal-case font-normal text-white/20">— optional</span>
          </label>
          <input
            type="number"
            min={1}
            step={10}
            placeholder="e.g. 150"
            value={targetWords ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onChange?.({ targetWords: isNaN(v) || v < 1 ? null : v });
            }}
            className={cn(
              "w-full rounded-lg border border-white/[0.08] bg-[#252527]",
              "px-2.5 py-1.5 text-[12px] font-mono text-white/90",
              "placeholder:text-white/20",
              "focus:outline-none focus:border-violet-500/40 transition-colors"
            )}
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output row */}
        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">text</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-violet-300/70">
            output
          </span>
        </div>

      </div>
    </div>
  );
}

export const PromptCompressionNode = memo(PromptCompressionNodeComponent);
