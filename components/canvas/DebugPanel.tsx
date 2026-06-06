"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, RefreshCw, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, BookmarkPlus, Trash2, Plus, Pin, PinOff, CornerDownRight } from "lucide-react";
import type { EvalResult } from "@/lib/workflow-types";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 720;
const DEFAULT_HEIGHT = 380;

// ─── Types ──────────────────────────────────────────────────────────────────

interface NodeTraceEntry {
  nodeId: string;
  nodeType: string;
  inputSnapshot: string | null;
  outputSnapshot: string | null;
  durationMs: number;
  error: string | null;
  rawValue?: unknown;
  pinned?: boolean;
}

interface DebugResult {
  ok: boolean;
  output?: unknown;
  error?: string;
  traces: NodeTraceEntry[];
}

interface LogEntry {
  id: number;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  createdAt: string;
  nodes: (NodeTraceEntry & { id: number; createdAt: string })[];
}

interface Preset {
  id: number;
  name: string;
  body: string;
  headers: Record<string, string>;
  query: Record<string, string>;
}

interface KVRow { key: string; value: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSnapshot(raw: string | null): string {
  if (!raw || raw === "null") return "—";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function nodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    workflowInput: "Input",
    workflowOutput: "Output",
    anthropic: "Anthropic",
    text: "Text",
    number: "Number",
    boolean: "Boolean",
    "json-parser": "JSON Parser",
    "json-builder": "JSON Builder",
    "template-string": "Template String",
    router: "Router",
    "pii-redact": "PII Redact",
    "http-request": "HTTP Request",
    if: "If",
    math: "Math",
    "string-ops": "String Ops",
    datetime: "Date/Time",
    "type-cast": "Type Cast",
    "null-check": "Null Check",
    concat: "Concat",
    "array-length": "Array Length",
    pick: "Pick",
    "size-of": "Size Of",
    complexity: "Complexity",
    "token-counter": "Token Counter",
    "auth-validator": "Auth Validator",
    merge: "Merge",
    "try-catch": "Try/Catch",
    "vector-upsert": "Vector Upsert",
    "vector-search": "Vector Search",
    "list-manager": "List Manager",
    "access-list": "Access List",
  };
  return labels[type] ?? type;
}

function kvRowsToObject(rows: KVRow[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (k) obj[k] = r.value;
  }
  return obj;
}

function objectToKvRows(obj: Record<string, string>): KVRow[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

// ─── KV editor ───────────────────────────────────────────────────────────────

function KVEditor({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: KVRow[];
  onChange: (rows: KVRow[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const activeCount = rows.filter((r) => r.key.trim()).length;

  function addRow() {
    onChange([...rows, { key: "", value: "" }]);
    if (!open) setOpen(true);
  }

  function removeRow(i: number) {
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next);
    if (next.length === 0) setOpen(false);
  }

  function updateRow(i: number, field: "key" | "value", val: string) {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    onChange(next);
  }

  return (
    <div className="border border-white/[0.06] rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          type="button"
          onClick={() => { if (rows.length > 0) setOpen((v) => !v); }}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <span className="text-white/20">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
          <span className="font-medium uppercase tracking-wider">{label}</span>
          {activeCount > 0 && (
            <span className="text-violet-400/70 text-[10px] tabular-nums">({activeCount})</span>
          )}
        </button>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-0.5 text-[10px] text-white/30 hover:text-violet-400 transition-colors"
          title={`Add ${label.toLowerCase()} entry`}
        >
          <Plus className="h-2.5 w-2.5" />
          Add
        </button>
      </div>

      {open && rows.length > 0 && (
        <div className="border-t border-white/[0.06] px-2 py-1.5 space-y-1">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="text"
                value={row.key}
                onChange={(e) => updateRow(i, "key", e.target.value)}
                placeholder="key"
                className="flex-1 min-w-0 font-mono text-xs bg-[#1a1a1a] border border-white/[0.08] rounded px-2 py-1 text-white/70 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
              />
              <input
                type="text"
                value={row.value}
                onChange={(e) => updateRow(i, "value", e.target.value)}
                placeholder="value"
                className="flex-1 min-w-0 font-mono text-xs bg-[#1a1a1a] border border-white/[0.08] rounded px-2 py-1 text-white/70 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="shrink-0 text-white/20 hover:text-red-400 transition-colors"
                title="Remove"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trace row ────────────────────────────────────────────────────────────────

function TraceRow({
  trace,
  onNodeClick,
  highlighted,
  pinned,
  onPin,
  onUnpin,
  onRerunFrom,
}: {
  trace: NodeTraceEntry;
  onNodeClick?: (nodeId: string) => void;
  highlighted: boolean;
  pinned?: boolean;
  onPin?: (result: EvalResult) => void;
  onUnpin?: () => void;
  onRerunFrom?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasError = !!trace.error;

  return (
    <div
      className={[
        "border-b border-white/[0.06] last:border-0 transition-colors",
        highlighted ? "bg-violet-500/10" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
        onClick={() => {
          setExpanded((v) => !v);
          if (onNodeClick) onNodeClick(trace.nodeId);
        }}
      >
        <span className="text-white/30 shrink-0">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
        {hasError
          ? <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
          : <CheckCircle2 className="h-3 w-3 text-emerald-500/60 shrink-0" />}
        {(pinned || trace.pinned) && (
          <Pin className="h-3 w-3 text-amber-400 shrink-0" />
        )}
        <span className="text-xs text-white/80 font-medium shrink-0 w-28 truncate">
          {nodeTypeLabel(trace.nodeType)}
        </span>
        <span className="text-xs text-white/30 font-mono truncate flex-1">
          {trace.outputSnapshot && trace.outputSnapshot !== "null"
            ? trace.outputSnapshot.length > 60
              ? trace.outputSnapshot.slice(0, 60) + "…"
              : trace.outputSnapshot
            : hasError
              ? <span className="text-red-400/70">{trace.error}</span>
              : "—"}
        </span>
        <span className="text-xs text-white/30 shrink-0 tabular-nums">{trace.durationMs}ms</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {hasError && (
            <div className="rounded bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-xs font-medium text-red-400 mb-0.5">Error</p>
              <p className="text-xs font-mono text-red-300 break-all">{trace.error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-white/30 mb-1 font-medium uppercase tracking-wider">Input</p>
              <pre className="text-xs font-mono text-white/60 bg-white/[0.04] rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {formatSnapshot(trace.inputSnapshot)}
              </pre>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1 font-medium uppercase tracking-wider">Output</p>
              <pre className="text-xs font-mono text-white/60 bg-white/[0.04] rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {formatSnapshot(trace.outputSnapshot)}
              </pre>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/20 font-mono">node id: {trace.nodeId}</p>
            <div className="flex items-center gap-1">
              {onRerunFrom && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRerunFrom(); }}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-violet-400 hover:bg-violet-500/10 px-2 py-1 rounded transition-colors"
                  title="Re-run the workflow starting from this node"
                >
                  <CornerDownRight className="h-3 w-3" />
                  Re-run from here
                </button>
              )}
              {(onPin || onUnpin) && (
                pinned
                  ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUnpin?.(); }}
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2 py-1 rounded transition-colors"
                      title="Unpin this node"
                    >
                      <PinOff className="h-3 w-3" />
                      Unpin
                    </button>
                  )
                  : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPin) {
                          onPin({ value: trace.rawValue, inputTokens: 0, outputTokens: 0 });
                        }
                      }}
                      disabled={trace.error !== null}
                      className="flex items-center gap-1 text-xs text-white/40 hover:text-amber-400 hover:bg-amber-500/10 px-2 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={trace.error ? "Cannot pin a node that errored" : "Pin this node's output"}
                    >
                      <Pin className="h-3 w-3" />
                      Pin output
                    </button>
                  )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sandbox tab ─────────────────────────────────────────────────────────────

function SandboxTab({
  slug,
  nodes,
  edges,
  onNodeHighlight,
  highlightedNodeId,
  runnerRef,
  rerunTriggerRef,
  onRunningChange,
  pinData,
  onPinNode,
  onUnpinNode,
}: {
  slug: string;
  nodes: unknown[];
  edges: unknown[];
  onNodeHighlight: (nodeId: string | null) => void;
  highlightedNodeId: string | null;
  runnerRef: React.RefObject<(() => void) | null>;
  rerunTriggerRef: React.RefObject<((nodeId: string) => void) | null>;
  onRunningChange: (v: boolean) => void;
  pinData: Record<string, EvalResult>;
  onPinNode: (nodeId: string, result: EvalResult) => void;
  onUnpinNode: (nodeId: string) => void;
}) {
  const [inputJson, setInputJson] = useState('{\n  "messages": [{"role": "user", "content": "Hello"}]\n}');
  const [headerRows, setHeaderRows] = useState<KVRow[]>([]);
  const [queryRows, setQueryRows] = useState<KVRow[]>([]);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [jsonError, setJsonError] = useState("");

  const [presets, setPresets] = useState<Preset[]>([]);
  const [savingName, setSavingName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const saveInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/workflows/${slug}/presets`)
      .then((r) => r.json())
      .then((d: { presets?: Preset[] }) => setPresets(d.presets ?? []))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (saveOpen) saveInputRef.current?.focus();
  }, [saveOpen]);

  function validateJson(text: string) {
    if (!text.trim()) { setJsonError(""); return; }
    try { JSON.parse(text); setJsonError(""); }
    catch (e) { setJsonError(e instanceof Error ? e.message : "Invalid JSON"); }
  }

  async function handleRun(startNodeId?: string) {
    if (jsonError) return;
    onRunningChange(true);
    setResult(null);
    try {
      let body: Record<string, unknown> = {};
      if (inputJson.trim()) {
        try { body = JSON.parse(inputJson) as Record<string, unknown>; }
        catch { setJsonError("Invalid JSON"); onRunningChange(false); return; }
      }
      const sandboxHeaders = kvRowsToObject(headerRows);
      const sandboxQuery = kvRowsToObject(queryRows);
      const res = await fetch(`/api/workflows/${slug}/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          __nodes: nodes,
          __edges: edges,
          ...(Object.keys(sandboxHeaders).length > 0 ? { __headers: sandboxHeaders } : {}),
          ...(Object.keys(sandboxQuery).length > 0 ? { __query: sandboxQuery } : {}),
          ...(startNodeId ? { __startNodeId: startNodeId } : {}),
        }),
      });
      const data = await res.json() as DebugResult;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: String(err), traces: [] });
    } finally {
      onRunningChange(false);
    }
  }

  async function handleSavePreset() {
    const name = savingName.trim();
    if (!name) { setSaveError("Name is required"); return; }
    if (jsonError || !inputJson.trim()) { setSaveError("Fix JSON errors first"); return; }
    setSaveError("");
    try {
      const res = await fetch(`/api/workflows/${slug}/presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          body: inputJson,
          headers: kvRowsToObject(headerRows),
          query: kvRowsToObject(queryRows),
        }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; setSaveError(d.error ?? "Failed"); return; }
      const { preset } = await res.json() as { preset: Preset };
      setPresets((prev) => {
        const filtered = prev.filter((p) => p.id !== preset.id && p.name !== preset.name);
        return [preset, ...filtered];
      });
      setSaveOpen(false);
      setSavingName("");
    } catch {
      setSaveError("Network error");
    }
  }

  async function handleDeletePreset(id: number) {
    try {
      await fetch(`/api/workflows/${slug}/presets/${id}`, { method: "DELETE" });
      setPresets((prev) => prev.filter((p) => p.id !== id));
    } catch { /* silent */ }
  }

  function handleLoadPreset(preset: Preset) {
    setInputJson(preset.body);
    validateJson(preset.body);
    setHeaderRows(objectToKvRows(preset.headers ?? {}));
    setQueryRows(objectToKvRows(preset.query ?? {}));
  }

  // Expose handleRun so the header button and canvas context menu can trigger it.
  // Written in an effect so ref writes happen outside render (satisfies react-hooks/refs).
  useEffect(() => {
    runnerRef.current = () => { void handleRun(); };
    rerunTriggerRef.current = (nodeId: string) => { void handleRun(nodeId); };
  });

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-auto">
      {/* Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-white/30 font-medium uppercase tracking-wider">Request Body (JSON)</p>
          <button
            type="button"
            onClick={() => { setSaveOpen((v) => !v); setSaveError(""); }}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-violet-400 transition-colors"
            title="Save as preset"
          >
            <BookmarkPlus className="h-3 w-3" />
            Save
          </button>
        </div>

        {/* Save preset inline form */}
        {saveOpen && (
          <div className="flex items-center gap-2 mb-2">
            <input
              ref={saveInputRef}
              type="text"
              value={savingName}
              onChange={(e) => { setSavingName(e.target.value); setSaveError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); if (e.key === "Escape") { setSaveOpen(false); setSavingName(""); } }}
              placeholder="Preset name…"
              maxLength={100}
              className="flex-1 font-mono text-xs bg-[#1a1a1a] border border-white/[0.08] rounded px-2 py-1 text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="text-xs px-2 py-1 rounded bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setSaveOpen(false); setSavingName(""); setSaveError(""); }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {saveError && <p className="text-xs text-red-400 mb-1">{saveError}</p>}

        {/* Presets list */}
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-0.5 rounded bg-white/[0.06] border border-white/[0.08] overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleLoadPreset(p)}
                  className="px-2 py-0.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                  title={`Load preset: ${p.name}`}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePreset(p.id)}
                  className="self-stretch flex items-center px-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete preset"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            value={inputJson}
            onChange={(e) => { setInputJson(e.target.value); validateJson(e.target.value); }}
            rows={5}
            className={[
              "w-full font-mono text-xs bg-[#1a1a1a] border rounded-md px-3 py-2 text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 resize-none",
              jsonError ? "border-red-500/40 focus:ring-red-500/20" : "border-white/[0.08] focus:ring-violet-500/20",
            ].join(" ")}
            placeholder="{}"
            spellCheck={false}
          />
          {jsonError && <p className="text-xs text-red-400 mt-1">{jsonError}</p>}
        </div>
      </div>

      {/* Output */}
      {result && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-xs text-white/30 font-medium uppercase tracking-wider">Output</p>
              {result.ok
                ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                : <AlertCircle className="h-3 w-3 text-red-400" />}
            </div>
            {result.error ? (
              <div className="rounded bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="text-xs font-mono text-red-300 break-all">{result.error}</p>
              </div>
            ) : (
              <pre className="text-xs font-mono text-white/70 bg-[#1a1a1a] border border-white/[0.08] rounded-md p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                {typeof result.output === "string"
                  ? result.output
                  : JSON.stringify(result.output, null, 2)}
              </pre>
            )}
          </div>

          {/* Node traces */}
          {result.traces.length > 0 && (
            <div>
              <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-1.5">
                Node Trace ({result.traces.length} nodes)
              </p>
              <div className="border border-white/[0.08] rounded-md overflow-hidden">
                {result.traces.map((t, i) => (
                  <TraceRow
                    key={`${t.nodeId}-${t.nodeType}-${i}`}
                    trace={t}
                    onNodeClick={(id) => onNodeHighlight(highlightedNodeId === id ? null : id)}
                    highlighted={highlightedNodeId === t.nodeId}
                    pinned={!!pinData[t.nodeId]}
                    onPin={(r) => onPinNode(t.nodeId, r)}
                    onUnpin={() => onUnpinNode(t.nodeId)}
                    onRerunFrom={() => handleRun(t.nodeId)}
                  />
                ))}
              </div>
              {highlightedNodeId && (
                <button
                  type="button"
                  onClick={() => onNodeHighlight(null)}
                  className="mt-1 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Clear highlight
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Headers */}
      <KVEditor label="Headers" rows={headerRows} onChange={setHeaderRows} />

      {/* Query params */}
      <KVEditor label="Query Params" rows={queryRows} onChange={setQueryRows} />
    </div>
  );
}

// ─── Logs tab ─────────────────────────────────────────────────────────────────

function LogsTab({
  slug,
  onNodeHighlight,
  highlightedNodeId,
}: {
  slug: string;
  onNodeHighlight: (nodeId: string | null) => void;
  highlightedNodeId: string | null;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${slug}/logs`);
      if (res.ok) {
        const data = await res.json() as { logs: LogEntry[] };
        setLogs(data.logs);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-white/30">
        Loading…
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-24 gap-1 text-white/30">
        <p className="text-xs">No requests yet.</p>
        <p className="text-xs">Make a request to see logs here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <div className="divide-y divide-white/[0.06]">
        {logs.map((log) => (
          <div key={log.id}>
            {/* Request summary row */}
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
              onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
            >
              <span className="text-white/30 shrink-0">
                {expandedLogId === log.id
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />}
              </span>
              <span className="text-xs font-mono text-white/40 shrink-0 w-36 truncate">
                {new Date(log.createdAt + "Z").toLocaleTimeString()}
              </span>
              <span className="text-xs text-white/50 flex-1 truncate">
                {log.model ?? "—"}
              </span>
              <span className="text-xs text-white/30 tabular-nums shrink-0">{log.latencyMs}ms</span>
              {log.inputTokens > 0 && (
                <span className="text-xs text-white/20 tabular-nums shrink-0">
                  {log.inputTokens}↑ {log.outputTokens}↓
                </span>
              )}
              <span className="text-xs text-white/20 shrink-0">
                {log.nodes.length} nodes
              </span>
            </button>

            {/* Expanded node traces */}
            {expandedLogId === log.id && log.nodes.length > 0 && (
              <div className="border-t border-white/[0.04] bg-white/[0.02]">
                {log.nodes.map((n) => (
                  <TraceRow
                    key={n.id}
                    trace={n}
                    onNodeClick={(id) => onNodeHighlight(highlightedNodeId === id ? null : id)}
                    highlighted={highlightedNodeId === n.nodeId}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DebugPanel ───────────────────────────────────────────────────────────────

interface DebugPanelProps {
  slug: string;
  nodes: unknown[];
  edges: unknown[];
  onClose: () => void;
  onNodeHighlight: (nodeId: string | null) => void;
  highlightedNodeId: string | null;
  pinData: Record<string, EvalResult>;
  onPinNode: (nodeId: string, result: EvalResult) => void;
  onUnpinNode: (nodeId: string) => void;
  rerunTriggerRef?: React.RefObject<((nodeId: string) => void) | null>;
}

export function DebugPanel({ slug, nodes, edges, onClose, onNodeHighlight, highlightedNodeId, pinData, onPinNode, onUnpinNode, rerunTriggerRef: externalRerunRef }: DebugPanelProps) {
  const [tab, setTab] = useState<"sandbox" | "logs">("sandbox");
  const [running, setRunning] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const runnerRef = useRef<(() => void) | null>(null);
  const internalRerunRef = useRef<((nodeId: string) => void) | null>(null);
  const rerunTriggerRef = externalRerunRef ?? internalRerunRef;

  // ── Drag-to-resize ──────────────────────────────────────────────────────
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);
  // Always-current height so onMouseUp reads the post-drag value, not the
  // stale `height` captured in the mousedown closure.
  const heightRef = useRef(height);
  // eslint-disable-next-line react-hooks/refs
  heightRef.current = height;

  function onHandleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragState.current = { startY: e.clientY, startHeight: height };

    function onMouseMove(ev: MouseEvent) {
      if (!dragState.current) return;
      const delta = dragState.current.startY - ev.clientY;
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragState.current.startHeight + delta));
      heightRef.current = next;
      setHeight(next);
    }

    function onMouseUp() {
      const reachedBottom = dragState.current && heightRef.current <= MIN_HEIGHT;
      dragState.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (reachedBottom) {
        setHeight(DEFAULT_HEIGHT);
        onClose();
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div className="flex flex-col border-t border-white/[0.06] bg-[#111111] shrink-0" style={{ height }}>
      {/* Drag handle */}
      <div
        onMouseDown={onHandleMouseDown}
        className="h-1 shrink-0 cursor-ns-resize hover:bg-violet-500/40 transition-colors bg-white/[0.04] group"
        title="Drag to resize"
      >
        <div className="mx-auto mt-px w-8 h-px rounded-full bg-white/20 group-hover:bg-violet-400/60 transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-1 px-3 h-9 border-b border-white/[0.06] shrink-0">
        <div className="flex gap-0.5">
          {(["sandbox", "logs"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "px-3 py-1 rounded text-xs font-medium transition-colors capitalize",
                tab === t
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/70",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1" />

        {/* Run button — only shown on Sandbox tab */}
        {tab === "sandbox" && (
          <button
            type="button"
            onClick={() => runnerRef.current?.()}
            disabled={running}
            className="h-6 w-6 flex items-center justify-center rounded text-white/50 hover:text-violet-400 hover:bg-violet-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Run"
          >
            {running
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <Play className="h-3.5 w-3.5" />}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Close debug panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "sandbox" ? (
          <SandboxTab
            slug={slug}
            nodes={nodes}
            edges={edges}
            onNodeHighlight={onNodeHighlight}
            highlightedNodeId={highlightedNodeId}
            runnerRef={runnerRef}
            rerunTriggerRef={rerunTriggerRef}
            onRunningChange={setRunning}
            pinData={pinData}
            onPinNode={onPinNode}
            onUnpinNode={onUnpinNode}
          />
        ) : (
          <LogsTab
            slug={slug}
            onNodeHighlight={onNodeHighlight}
            highlightedNodeId={highlightedNodeId}
          />
        )}
      </div>
    </div>
  );
}
