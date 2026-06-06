"use client";

import { memo, useRef, useLayoutEffect, useState, useEffect } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
import { analyzeSentiment } from "@/lib/sentiment";
export type { SentimentNodeData } from "@/lib/node-types";
import type { SentimentNodeData, SentimentLabel } from "@/lib/node-types";

const HANDLE_TOP = 28;

const OUTPUT_ROWS = [
  { id: "score",    label: "score (−1…+1)" },
  { id: "label",    label: "label" },
  { id: "positive", label: "positive →" },
  { id: "neutral",  label: "neutral →" },
  { id: "negative", label: "negative →" },
] as const;

const LABEL_COLOR: Record<SentimentLabel, string> = {
  positive: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  neutral:  "bg-white/10       border-white/20       text-white/50",
  negative: "bg-red-500/15     border-red-500/30     text-red-300",
};

const SCORE_COLOR = (score: number) =>
  score >  0.05 ? "text-emerald-400" :
  score < -0.05 ? "text-red-400"     :
                  "text-white/40";

const ROUTE_DOT: Record<string, string> = {
  score:    "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400",
  label:    "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-sky-400",
  positive: "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400",
  neutral:  "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30",
  negative: "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-red-400",
};

function SentimentNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d                = data as unknown as SentimentNodeData;
  const testText         = d.testText          ?? "";
  const positiveThreshold = d.positiveThreshold ?? 0.05;
  const negativeThreshold = d.negativeThreshold ?? -0.05;
  const lastScore        = d.lastScore         ?? null;
  const lastLabel        = d.lastLabel         ?? null;
  const lastWordCount    = d.lastWordCount      ?? 0;
  const lastPositiveWords = d.lastPositiveWords ?? [];
  const lastNegativeWords = d.lastNegativeWords ?? [];
  const onChange         = d.onChange;

  const nodeRef     = useRef<HTMLDivElement>(null);
  const refsOutput  = useRef<Map<string, HTMLElement>>(new Map());
  const [tops, setTops] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const next: Record<string, number> = {};
    refsOutput.current.forEach((el, key) => {
      const r = el.getBoundingClientRect();
      next[key] = (r.top + r.height / 2 - nodeTop) / zoom;
    });
    setTops(next);
  }, [zoom, lastWordCount, lastScore]);

  useEffect(() => {
    if (!testText.trim()) {
      onChange?.({
        lastScore: null,
        lastLabel: null,
        lastWordCount: 0,
        lastPositiveWords: [],
        lastNegativeWords: [],
      });
      return;
    }
    const result = analyzeSentiment(testText, positiveThreshold, negativeThreshold);
    onChange?.({
      lastScore:        result.score,
      lastLabel:        result.label,
      lastWordCount:    result.wordCount,
      lastPositiveWords: result.positiveWords,
      lastNegativeWords: result.negativeWords,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testText, positiveThreshold, negativeThreshold]);

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-72 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-rose-500/50 shadow-rose-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="input" position={Position.Left} style={{ top: HANDLE_TOP }}
        className="!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400" />

      {OUTPUT_ROWS.map(({ id }) => (
        <Handle
          key={id}
          type="source"
          id={id}
          position={Position.Right}
          style={{ top: tops[id] ?? HANDLE_TOP }}
          className={ROUTE_DOT[id]}
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
          <SmilePlus className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Sentiment</p>
          <p className="text-[11px] text-rose-300/70 mt-0.5">score text −1 → +1</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">

        {/* Test text */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Test Text</p>
          <VarField
            as="textarea"
            value={testText}
            onChange={(v) => onChange?.({ testText: v })}
            rows={3}
            placeholder="Type text to score it live…"
            focusBorderClass="focus:border-rose-500/40"
            typographyClass="text-[11px] px-2.5 py-2 font-mono"
            textColorClass="text-white/80"
            expandTitle="Test Text"
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Score display */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "text-2xl font-mono font-bold tabular-nums leading-none",
            lastScore !== null ? SCORE_COLOR(lastScore) : "text-white/15"
          )}>
            {lastScore !== null ? (lastScore >= 0 ? "+" : "") + lastScore.toFixed(3) : "±.–––"}
          </span>

          {lastLabel ? (
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider",
              LABEL_COLOR[lastLabel]
            )}>
              {lastLabel}
            </span>
          ) : (
            <span className="text-[10px] text-white/15 font-mono">no input</span>
          )}
        </div>

        {/* Word count */}
        {lastWordCount > 0 && (
          <p className="text-[10px] text-white/25 font-mono">{lastWordCount} scored words</p>
        )}

        {/* Word chips */}
        {(lastPositiveWords.length > 0 || lastNegativeWords.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {lastPositiveWords.map((w) => (
              <span key={`pos-${w}`}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/70">
                +{w}
              </span>
            ))}
            {lastNegativeWords.map((w) => (
              <span key={`neg-${w}`}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-300/70">
                −{w}
              </span>
            ))}
          </div>
        )}

        {/* Thresholds */}
        <div className="border-t border-white/[0.06]" />
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Thresholds</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-emerald-400/60 mb-1">Positive ≥</p>
              <input
                type="number"
                step="0.01"
                min="-1"
                max="1"
                value={positiveThreshold}
                onChange={(e) => onChange?.({ positiveThreshold: parseFloat(e.target.value) || 0 })}
                className={cn(
                  "w-full rounded-lg border border-white/[0.08] bg-[#252527]",
                  "px-2.5 py-1.5 text-[12px] font-mono text-white/90",
                  "focus:outline-none focus:border-emerald-500/40 transition-colors"
                )}
              />
            </div>
            <div>
              <p className="text-[9px] text-red-400/60 mb-1">Negative ≤</p>
              <input
                type="number"
                step="0.01"
                min="-1"
                max="1"
                value={negativeThreshold}
                onChange={(e) => onChange?.({ negativeThreshold: parseFloat(e.target.value) || 0 })}
                className={cn(
                  "w-full rounded-lg border border-white/[0.08] bg-[#252527]",
                  "px-2.5 py-1.5 text-[12px] font-mono text-white/90",
                  "focus:outline-none focus:border-red-500/40 transition-colors"
                )}
              />
            </div>
          </div>
        </div>

        {/* Output rows (handle alignment targets) */}
        <div className="border-t border-white/[0.06]" />
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Outputs</p>
          {OUTPUT_ROWS.map(({ id, label }) => (
            <div
              key={id}
              ref={(el) => {
                if (el) refsOutput.current.set(id, el);
                else refsOutput.current.delete(id);
              }}
              className="flex items-center justify-end gap-2 h-6"
            >
              <span className="text-[11px] font-mono text-white/40">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export const SentimentNode = memo(SentimentNodeComponent);
