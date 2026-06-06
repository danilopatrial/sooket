"use client";

import { memo, useRef, useLayoutEffect, useState, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
import { scoreHeuristics } from "@/lib/complexity/heuristics";
import { blendScores, scoreToTier } from "@/lib/complexity/blender";
export type { ComplexityNodeData } from "@/lib/node-types";
import type { ComplexityNodeData } from "@/lib/node-types";
import type { Tier } from "@/lib/node-types";

const TIER_BG: Record<Tier, string> = {
  simple:  "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  medium:  "bg-amber-500/15  border-amber-500/30  text-amber-300",
  complex: "bg-red-500/15    border-red-500/30    text-red-300",
};

const SCORE_COLOR = (score: number) =>
  score < 0.45 ? "text-emerald-400" :
  score < 0.70 ? "text-amber-400"   :
                 "text-red-400";

const HANDLE_TOP = 28;

const OUTPUT_ROWS = [
  { id: "score", label: "score (0–1)" },
  { id: "tier",  label: "tier" },
] as const;

function ComplexityNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d             = data as unknown as ComplexityNodeData;
  const testPrompt    = d.testPrompt    ?? "";
  const lastScore     = d.lastScore     ?? null;
  const lastTier      = d.lastTier      ?? null;
  const lastSignals   = d.lastSignals   ?? [];
  const lastTokenCount = d.lastTokenCount ?? 0;
  const onChange      = d.onChange;

  const nodeRef     = useRef<HTMLDivElement>(null);
  const refsOutput  = useRef<Map<string, HTMLElement>>(new Map());
  const [tops, setTops] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [method, setMethod]   = useState<"heuristic" | "embedding" | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  // eslint-disable-next-line react-hooks/refs
  onChangeRef.current = onChange;

  // Re-measure whenever anything that shifts output rows changes
  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const next: Record<string, number> = {};
    refsOutput.current.forEach((el, key) => {
      const r = el.getBoundingClientRect();
      next[key] = (r.top + r.height / 2 - nodeTop) / zoom;
    });
    setTops(next);
  }, [zoom, lastSignals.length, lastTokenCount, lastScore]);

  const runScoring = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      onChangeRef.current?.({ lastScore: null, lastTier: null, lastSignals: [], lastTokenCount: 0 });
      setMethod(null);
      return;
    }

    // Layer 1 — synchronous, always runs first
    const h = scoreHeuristics(prompt);

    // Short-circuit: confident result, skip Layer 2
    if (h.score < 0.25 || h.score > 0.70) {
      onChangeRef.current?.({
        lastScore: h.score,
        lastTier: h.tier,
        lastSignals: h.signals,
        lastTokenCount: h.tokenCount,
      });
      setMethod("heuristic");
      setLoading(false);
      return;
    }

    // Layer 2 — ambiguous band, call embedding API
    // Update signals/tokenCount but hold the current score until blending is done
    onChangeRef.current?.({ lastSignals: h.signals, lastTokenCount: h.tokenCount });
    setLoading(true);
    try {
      const res  = await fetch("/api/complexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      if (typeof json.embeddingScore === "number") {
        const blended = blendScores(h.score, json.embeddingScore);
        onChangeRef.current?.({ lastScore: blended, lastTier: scoreToTier(blended) });
        setMethod("embedding");
      } else {
        setMethod("heuristic");
      }
    } catch {
      setMethod("heuristic");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runScoring(testPrompt), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [testPrompt, runScoring]);

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-72 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-amber-500/50 shadow-amber-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="prompt" position={Position.Left}  style={{ top: HANDLE_TOP }} className={dot} />
      {OUTPUT_ROWS.map(({ id }) => (
        <Handle
          key={id}
          type="source"
          id={id}
          position={Position.Right}
          style={{ top: tops[id] ?? HANDLE_TOP }}
          className={dot}
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
          <Gauge className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Complexity Score</p>
          <p className="text-[11px] text-amber-300/70 mt-0.5">score prompt 0 – 1</p>
        </div>
        {loading && (
          <span className="text-[10px] text-amber-400/60 animate-pulse">scoring…</span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">

        {/* Test prompt textarea */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Test Prompt</p>
          <VarField
            as="textarea"
            value={testPrompt}
            onChange={(v) => onChange?.({ testPrompt: v })}
            rows={3}
            placeholder="Type a prompt to score it live…"
            focusBorderClass="focus:border-amber-500/40"
            typographyClass="text-[11px] px-2.5 py-2 font-mono"
            textColorClass="text-white/80"
            expandTitle="Test Prompt"
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Score + tier display */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className={cn(
              "text-2xl font-mono font-bold tabular-nums leading-none",
              lastScore !== null ? SCORE_COLOR(lastScore) : "text-white/15"
            )}>
              {lastScore !== null ? lastScore.toFixed(3) : "–.–––"}
            </span>
            {method && (
              <span className="text-[9px] text-white/20 font-mono">({method})</span>
            )}
          </div>

          {lastTier ? (
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider",
              TIER_BG[lastTier]
            )}>
              {lastTier}
            </span>
          ) : (
            <span className="text-[10px] text-white/15 font-mono">no input</span>
          )}
        </div>

        {/* Token count */}
        {lastTokenCount > 0 && (
          <p className="text-[10px] text-white/25 font-mono">{lastTokenCount} tokens</p>
        )}

        {/* Signals */}
        {lastSignals.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Signals</p>
            <div className="flex flex-wrap gap-1">
              {lastSignals.map((s) => (
                <span
                  key={s}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Output labels — each row is measured so handles align exactly */}
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

export const ComplexityNode = memo(ComplexityNodeComponent);
