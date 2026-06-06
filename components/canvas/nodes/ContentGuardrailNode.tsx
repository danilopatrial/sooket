"use client";

import { memo, useRef, useLayoutEffect, useState, useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { ShieldAlert, Plus, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextExpandModal } from "@/components/canvas/TextExpandModal";
export type { GuardrailPattern, ContentGuardrailNodeData } from "@/lib/node-types";
import type { ContentGuardrailNodeData } from "@/lib/node-types";






type Tops = { input: number; output: number; flagged: number };

function ContentGuardrailNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d        = data as unknown as ContentGuardrailNodeData;
  const connected = d.connectedHandles ?? [];
  const patterns  = useMemo(() => d.patterns ?? [], [d.patterns]);
  const useLlm    = d.useLlm    ?? false;
  const llmRules  = d.llmRules  ?? "";
  const action    = d.action    ?? "block";

  const nodeRef       = useRef<HTMLDivElement>(null);
  const inputRowRef   = useRef<HTMLDivElement>(null);
  const outputRowRef  = useRef<HTMLDivElement>(null);
  const flaggedRowRef = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState<Tops>({ input: 56, output: 56, flagged: 80 });
  const [llmRulesExpanded, setLlmRulesExpanded] = useState(false);

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
      output:  mid(outputRowRef),
      flagged: mid(flaggedRowRef),
    });
  }, [zoom, patterns.length, useLlm, action]);

  const addPattern = useCallback(() => {
    d.onChange?.({
      patterns: [...patterns, { id: crypto.randomUUID(), text: "" }],
    });
  }, [patterns, d]);

  const removePattern = useCallback((id: string) => {
    d.onChange?.({ patterns: patterns.filter((p) => p.id !== id) });
  }, [patterns, d]);

  const updatePattern = useCallback((id: string, text: string) => {
    d.onChange?.({
      patterns: patterns.map((p) => p.id === id ? { ...p, text } : p),
    });
  }, [patterns, d]);

  const mainHandle    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";
  const flaggedHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-rose-500/50 shadow-rose-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input"   position={Position.Left}  style={{ top: tops.input }}   className={mainHandle} />
      <Handle type="source" id="output"  position={Position.Right} style={{ top: tops.output }}  className={mainHandle} />
      <Handle type="source" id="flagged" position={Position.Right} style={{ top: tops.flagged }} className={flaggedHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-rose-700 flex items-center justify-center shrink-0">
          <ShieldAlert className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Content Guardrail</p>
          <p className="text-[11px] text-rose-300/70 mt-0.5 font-mono truncate">
            {patterns.length} pattern{patterns.length !== 1 ? "s" : ""}{useLlm ? " · LLM" : ""} · {action}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 nodrag">

        {/* input row */}
        <div ref={inputRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-rose-300" : "text-white/30"
          )}>
            input
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">string</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* action */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            On Violation
          </label>
          <select
            value={action}
            onChange={(e) => d.onChange?.({ action: e.target.value as "block" | "flag" })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-rose-500/50"
          >
            <option value="block">Block output</option>
            <option value="flag">Flag and pass through</option>
          </select>
        </div>

        {/* patterns */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
              Patterns
            </label>
            <button
              onClick={addPattern}
              className="flex items-center gap-1 text-[10px] text-rose-400/70 hover:text-rose-300 transition-colors"
            >
              <Plus className="h-3 w-3" /> add
            </button>
          </div>

          {patterns.length === 0 && (
            <p className="text-[10px] text-white/20 italic">No patterns — add keywords or phrases</p>
          )}

          {patterns.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <input
                type="text"
                value={p.text}
                placeholder="word, phrase, another"
                onChange={(e) => updatePattern(p.id, e.target.value)}
                className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                           text-[11px] text-white/80 placeholder:text-white/20
                           focus:outline-none focus:border-rose-500/50"
              />
              <button
                onClick={() => removePattern(p.id)}
                className="text-white/20 hover:text-rose-400 transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* LLM check toggle */}
        <div className="flex items-center justify-between py-0.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            LLM Check
          </label>
          <button
            onClick={() => d.onChange?.({ useLlm: !useLlm })}
            className={cn(
              "relative w-8 h-4 rounded-full transition-colors",
              useLlm ? "bg-rose-600" : "bg-white/10"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
              useLlm ? "left-4.5" : "left-0.5"
            )} />
          </button>
        </div>

        {/* LLM rules textarea — only shown when useLlm */}
        {useLlm && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
              Rules for LLM
            </label>
            <div className="relative">
              <textarea
                value={llmRules}
                placeholder={"- No competitor mentions\n- No legal advice\n- Professional tone only"}
                rows={4}
                onChange={(e) => d.onChange?.({ llmRules: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5
                           text-[11px] text-white/80 placeholder:text-white/20 resize-none
                           focus:outline-none focus:border-rose-500/50 font-mono leading-relaxed"
              />
              <button
                type="button"
                onClick={() => setLlmRulesExpanded(true)}
                className="absolute top-1.5 right-1.5 p-0.5 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                tabIndex={-1}
                title="Expand editor"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[9px] text-white/20">Uses workflow&apos;s Anthropic key · Haiku model</p>
            <TextExpandModal
              open={llmRulesExpanded}
              onOpenChange={setLlmRulesExpanded}
              value={llmRules}
              onChange={(v) => d.onChange?.({ llmRules: v })}
              title="Rules for LLM"
              placeholder={"- No competitor mentions\n- No legal advice\n- Professional tone only"}
            />
          </div>
        )}

        <div className="border-t border-white/[0.06]" />

        {/* output row */}
        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">string</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-300/70">
            output
          </span>
        </div>

        {/* flagged row */}
        <div ref={flaggedRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">reason</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-300/70">
            flagged
          </span>
        </div>

      </div>
    </div>
  );
}

export const ContentGuardrailNode = memo(ContentGuardrailNodeComponent);
