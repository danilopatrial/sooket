"use client";

import { memo, useRef, useLayoutEffect, useState, useEffect } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { encode } from "gpt-tokenizer";
import { VarField } from "@/components/canvas/VarField";

export type { TokenCounterNodeData } from "@/lib/node-types";
import type { TokenCounterNodeData } from "@/lib/node-types";

function TokenCounterNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d          = data as unknown as TokenCounterNodeData;
  const testPrompt = d.testPrompt ?? "";
  const onChange   = d.onChange;

  const nodeRef    = useRef<HTMLDivElement>(null);
  const outputRef  = useRef<HTMLDivElement>(null);
  const [top, setTop]         = useState(0);
  const [tokenCount, setTokenCount] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!nodeRef.current || !outputRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const r = outputRef.current.getBoundingClientRect();
    setTop((r.top + r.height / 2 - nodeTop) / zoom);
  }, [zoom]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!testPrompt.trim()) { setTokenCount(null); return; }
    setTokenCount(encode(testPrompt).length);
  }, [testPrompt]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-violet-500/50 shadow-violet-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"  position={Position.Left}  style={{ top: top || 28 }} className={dot} />
      <Handle type="source" id="output" position={Position.Right} style={{ top: top || 28 }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-violet-700 flex items-center justify-center shrink-0">
          <Hash className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Token Counter</p>
          <p className="text-[11px] text-violet-300/70 mt-0.5">count tokens via GPT tokenizer</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">

        {/* Test input */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Test Prompt</p>
          <VarField
            as="textarea"
            value={testPrompt}
            onChange={(v) => onChange?.({ testPrompt: v })}
            rows={2}
            placeholder="Type text to count tokens…"
            focusBorderClass="focus:border-violet-500/40"
            typographyClass="text-[11px] px-2.5 py-2 font-mono"
            textColorClass="text-white/80"
            expandTitle="Test Prompt"
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output row — measured for handle alignment */}
        <div
          ref={outputRef}
          className="flex items-center justify-between gap-2"
        >
          <span className={cn(
            "text-2xl font-mono font-bold tabular-nums leading-none",
            tokenCount !== null ? "text-violet-300" : "text-white/15"
          )}>
            {tokenCount !== null ? tokenCount : "–––"}
          </span>
          <span className="text-[11px] font-mono text-white/40">tokens</span>
        </div>

      </div>
    </div>
  );
}

export const TokenCounterNode = memo(TokenCounterNodeComponent);
