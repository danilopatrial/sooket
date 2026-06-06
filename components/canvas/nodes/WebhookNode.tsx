"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Webhook, Plus, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { WebhookHeader, WebhookMethod, WebhookMode, WebhookNodeData } from "@/lib/node-types";
import type { WebhookMethod, WebhookMode, WebhookNodeData } from "@/lib/node-types";

const METHODS: WebhookMethod[] = ["POST", "PUT", "PATCH", "GET"];

const METHOD_COLOR: Record<WebhookMethod, string> = {
  POST:  "bg-sky-600/30    border-sky-500/50    text-sky-300",
  PUT:   "bg-amber-600/30  border-amber-500/50  text-amber-300",
  PATCH: "bg-violet-600/30 border-violet-500/50 text-violet-300",
  GET:   "bg-emerald-600/30 border-emerald-500/50 text-emerald-300",
};

const HAS_BODY = new Set<WebhookMethod>(["POST", "PUT", "PATCH"]);

function useInboundUrl(): string {
  const [url] = useState(() => {
    if (typeof window === "undefined") return "";
    const match = window.location.pathname.match(/\/workflow\/([^/]+)/);
    if (!match) return "";
    return `${window.location.origin}/api/webhooks/${match[1]}`;
  });
  return url;
}

function WebhookNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d            = data as unknown as WebhookNodeData;
  const mode         = d.mode         ?? "action";
  const method       = d.method       ?? "POST";
  const url          = d.url          ?? "";
  const headers      = d.headers      ?? [];
  const bodyTemplate = d.bodyTemplate ?? "";
  const onChange     = d.onChange;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const headerRowRef = useRef<HTMLDivElement>(null);
  const urlRowRef    = useRef<HTMLDivElement>(null);
  const bodyRowRef   = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const inboundUrl = useInboundUrl();

  const isTrigger = mode === "trigger";
  const hasBody   = !isTrigger && HAS_BODY.has(method);
  const headerIds = headers.map((h) => h.id).join(",");

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const measure = (el: HTMLElement | null | undefined) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      input:  measure(headerRowRef.current),
      output: measure(headerRowRef.current),
      url:    measure(urlRowRef.current),
      body:   hasBody ? measure(bodyRowRef.current) : 0,
    });
  }, [mode, method, headerIds, zoom, hasBody]);

  function addHeader() {
    const id = Math.random().toString(36).slice(2, 8);
    onChange?.({ headers: [...headers, { id, key: "", value: "" }] });
  }

  function removeHeader(id: string) {
    onChange?.({ headers: headers.filter((h) => h.id !== id) });
  }

  function updateHeader(id: string, field: "key" | "value", val: string) {
    onChange?.({ headers: headers.map((h) => h.id === id ? { ...h, [field]: val } : h) });
  }

  async function copyUrl() {
    if (!inboundUrl) return;
    await navigator.clipboard.writeText(inboundUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-72 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-rose-500/50 shadow-rose-900/20" : "border-white/[0.08]"
      )}
    >
      {/* Trigger mode: only an output handle (the workflow starts here) */}
      {isTrigger ? (
        <Handle type="source" id="output" position={Position.Right} style={{ top: tops.output ?? 0 }} className={dot} />
      ) : (
        <>
          <Handle type="target" id="input"  position={Position.Left}  style={{ top: tops.input  ?? 0 }} className={dot} />
          <Handle type="target" id="url"    position={Position.Left}  style={{ top: tops.url    ?? 0 }} className={dot} />
          {hasBody && (
            <Handle type="target" id="body" position={Position.Left}  style={{ top: tops.body   ?? 0 }} className={dot} />
          )}
          <Handle type="source" id="output" position={Position.Right} style={{ top: tops.output ?? 0 }} className={dot} />
        </>
      )}

      {/* Header */}
      <div
        ref={headerRowRef}
        className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl"
      >
        <div className="h-8 w-8 rounded-lg bg-rose-700 flex items-center justify-center shrink-0">
          <Webhook className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Webhook</p>
          <p className="text-[11px] text-rose-300/70 mt-0.5">
            {isTrigger ? "inbound trigger" : "fire-and-forget side effect"}
          </p>
        </div>
        {!isTrigger && (
          <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border", METHOD_COLOR[method])}>
            {method}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">

        {/* Mode toggle */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Mode</p>
          <div className="flex gap-1">
            {(["action", "trigger"] as WebhookMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onChange?.({ mode: m })}
                className={cn(
                  "flex-1 rounded-md border py-1 transition-colors",
                  mode === m
                    ? "bg-rose-600/30 border-rose-500/50 text-rose-300"
                    : "bg-[#252527] border-white/[0.08] text-white/30 hover:text-white/60"
                )}
              >
                <p className="text-[9px] font-mono font-bold leading-none capitalize">{m}</p>
              </button>
            ))}
          </div>
        </div>

        {isTrigger ? (
          /* Trigger mode: show the inbound URL */
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Inbound URL</p>
            <div className="flex items-center gap-1.5">
              <p className="flex-1 rounded-lg border border-white/[0.08] bg-[#252527] px-2.5 py-1.5 text-[10px] font-mono text-white/60 truncate">
                {inboundUrl || "loading…"}
              </p>
              <button
                onClick={copyUrl}
                className="h-7 w-7 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors shrink-0"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="text-[9px] text-white/20 mt-1">
              Secure with <span className="font-mono">x-webhook-secret</span> header or <span className="font-mono">?token=</span> query param
            </p>
            <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-rose-500/[0.08] border border-rose-500/20 mt-2">
              <p className="text-[10px] text-rose-300/70">
                Activate the workflow to start accepting requests
              </p>
            </div>
          </div>
        ) : (
          /* Action mode: existing outbound config */
          <>
            {/* Method picker */}
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Method</p>
              <div className="flex gap-1">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => onChange?.({ method: m })}
                    className={cn(
                      "flex-1 rounded-md border py-1 transition-colors",
                      method === m
                        ? METHOD_COLOR[m]
                        : "bg-[#252527] border-white/[0.08] text-white/30 hover:text-white/60"
                    )}
                  >
                    <p className="text-[9px] font-mono font-bold leading-none">{m}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* URL row */}
            <div ref={urlRowRef}>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">URL</p>
              <VarField
                as="input"
                value={url}
                onChange={(v) => onChange?.({ url: v })}
                placeholder="https://hooks.slack.com/…"
                focusBorderClass="focus:border-rose-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/80"
              />
              <p className="text-[9px] text-white/20 mt-0.5">connect url handle to override dynamically</p>
            </div>

            {/* Body template row */}
            {hasBody && (
              <div ref={bodyRowRef}>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Body</p>
                <VarField
                  value={bodyTemplate}
                  onChange={(v) => onChange?.({ bodyTemplate: v })}
                  rows={3}
                  placeholder={'{"text": "notification text"}'}
                  focusBorderClass="focus:border-rose-500/40"
                  textColorClass="text-white/80"
                  expandTitle="Body"
                />
                <p className="text-[9px] text-white/20 mt-0.5">connect body handle to use dynamic value</p>
              </div>
            )}

            {/* Headers */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Headers</p>
              {headers.map((h) => (
                <div key={h.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={h.key}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateHeader(h.id, "key", e.target.value)}
                    placeholder="Content-Type"
                    className="w-24 min-w-0 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/80 font-mono focus:outline-none focus:border-rose-500/40 transition-colors placeholder-white/20"
                  />
                  <VarField
                    as="input"
                    value={h.value}
                    onChange={(v) => updateHeader(h.id, "value", v)}
                    placeholder="application/json"
                    focusBorderClass="focus:border-rose-500/40"
                    typographyClass="text-[11px] px-2 py-1.5 font-mono"
                    textColorClass="text-white/60"
                    wrapperClass="flex-1 min-w-0"
                  />
                  <button
                    onClick={() => removeHeader(h.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={addHeader}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add header
              </button>
            </div>

            <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-rose-500/[0.08] border border-rose-500/20">
              <p className="text-[10px] text-rose-300/70">
                Fires asynchronously — never blocks the response
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export const WebhookNode = memo(WebhookNodeComponent);
