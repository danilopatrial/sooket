"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface NodeOutput {
  value: unknown;
  inputTokens: number;
  outputTokens: number;
  model?: string;
}

interface Execution {
  id: number;
  status: "completed" | "failed" | "crashed" | "running" | string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  latencyMs: number | null;
  requestLogId: number | null;
  nodeOutputs: Record<string, NodeOutput>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
        <XCircle className="h-3.5 w-3.5" /> Failed
      </span>
    );
  }
  if (status === "crashed") {
    return (
      <span className="flex items-center gap-1 text-orange-400 text-xs font-medium">
        <AlertCircle className="h-3.5 w-3.5" /> Crashed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-yellow-400 text-xs font-medium">
      <Clock className="h-3.5 w-3.5 animate-spin" /> Running
    </span>
  );
}

function formatTs(iso: string) {
  return new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function NodeOutputRow({ nodeKey, output }: { nodeKey: string; output: NodeOutput }) {
  const [open, setOpen] = useState(false);
  const preview = output.value === null ? "null"
    : typeof output.value === "object"
      ? JSON.stringify(output.value).slice(0, 80) + (JSON.stringify(output.value).length > 80 ? "…" : "")
      : String(output.value).slice(0, 80);

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        type="button"
        className="flex w-full items-start gap-2 py-2 px-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />}
        <span className="text-xs font-mono text-muted-foreground min-w-[120px]">{nodeKey.split(":")[0]}</span>
        <span className="text-xs text-foreground/70 truncate">{preview}</span>
      </button>
      {open && (
        <pre className="mx-3 mb-2 p-2 rounded bg-muted/50 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(output.value, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ExecutionRow({ exec }: { exec: Execution }) {
  const [open, setOpen] = useState(false);
  const nodeKeys = Object.keys(exec.nodeOutputs);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">#{exec.id}</span>
        <StatusBadge status={exec.status} />
        <span className="flex-1 text-xs text-muted-foreground">{formatTs(exec.startedAt)}</span>
        <span className="text-xs text-muted-foreground">{formatDuration(exec.latencyMs)}</span>
        <span className="text-xs text-muted-foreground ml-2">{nodeKeys.length} node{nodeKeys.length !== 1 ? "s" : ""}</span>
      </button>

      {open && nodeKeys.length > 0 && (
        <div className="border-t border-border/60 bg-muted/10">
          <p className="px-3 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Node outputs</p>
          {nodeKeys.map((k) => (
            <NodeOutputRow key={k} nodeKey={k} output={exec.nodeOutputs[k]} />
          ))}
        </div>
      )}

      {open && nodeKeys.length === 0 && (
        <div className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
          No node output data captured for this execution.
        </div>
      )}
    </div>
  );
}

export function ExecutionsTab({ slug }: { slug: string }) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  // Incrementing this triggers a re-fetch in the effect without synchronous setState in the effect body
  const [fetchTick, setFetchTick] = useState(0);
  const PAGE = 20;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/workflows/${slug}/executions?limit=${PAGE}&offset=${offset}`)
      .then((r) => r.json())
      .then((d: { executions: Execution[]; total: number }) => {
        if (cancelled) return;
        setExecutions(d.executions ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug, offset, fetchTick]);

  const load = useCallback((off: number) => {
    setLoading(true);
    setOffset(off);
    setFetchTick((t) => t + 1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Execution History</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Past workflow runs with per-node output.</p>
        </div>
        <button
          type="button"
          onClick={() => load(offset)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && executions.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!loading && executions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No executions yet. Trigger the workflow via the API or the debug panel.</p>
        </div>
      )}

      <div className="space-y-2">
        {executions.map((e) => <ExecutionRow key={e.id} exec={e} />)}
      </div>

      {total > PAGE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => load(Math.max(0, offset - PAGE))}
              className="px-3 py-1 rounded border border-border hover:bg-muted/50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={offset + PAGE >= total}
              onClick={() => load(offset + PAGE)}
              className="px-3 py-1 rounded border border-border hover:bg-muted/50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
