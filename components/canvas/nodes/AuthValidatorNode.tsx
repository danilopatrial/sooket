"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { ShieldCheck, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { AuthClaim, AuthValidatorNodeData } from "@/lib/node-types";
import type { AuthValidatorNodeData } from "@/lib/node-types";






// Header height ≈ 56px → center ≈ 28px
const TOKEN_HANDLE_TOP = 28;

function AuthValidatorNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d          = data as unknown as AuthValidatorNodeData;
  const mode       = d.mode       ?? "jwt";
  const headerName = d.headerName ?? "Authorization";
  const algorithm  = d.algorithm  ?? "HS256";
  const secret     = d.secret     ?? "";
  const jwksUrl    = d.jwksUrl    ?? "";
  const claims     = d.claims     ?? [];
  const apiKeys    = d.apiKeys    ?? [];
  const onChange   = d.onChange;
  const connected  = new Set(d.connectedHandles ?? []);

  const nodeRef        = useRef<HTMLDivElement>(null);
  const tokenSourceRef = useRef<HTMLDivElement>(null);
  const secretRef      = useRef<HTMLDivElement>(null);
  const outputRefs     = useRef<Map<string, HTMLElement>>(new Map());
  const [tops, setTops] = useState<Record<string, number>>({});

  const claimIds = claims.map((c) => c.id).join(",");

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const measure = (el: HTMLElement | null | undefined) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    const next: Record<string, number> = {
      tokenSource: measure(tokenSourceRef.current),
      secret:      measure(secretRef.current),
    };
    outputRefs.current.forEach((el, key) => { next[key] = measure(el); });
    setTops(next);
  }, [mode, algorithm, claimIds, zoom]);

  function addClaim() {
    onChange?.({ claims: [...claims, { id: Math.random().toString(36).slice(2, 8), name: "" }] });
  }
  function removeClaim(id: string) {
    onChange?.({ claims: claims.filter((c) => c.id !== id) });
  }
  function updateClaim(id: string, name: string) {
    onChange?.({ claims: claims.map((c) => (c.id === id ? { ...c, name } : c)) });
  }

  function addApiKey() {
    onChange?.({ apiKeys: [...apiKeys, ""] });
  }
  function removeApiKey(i: number) {
    onChange?.({ apiKeys: apiKeys.filter((_, idx) => idx !== i) });
  }
  function updateApiKey(i: number, val: string) {
    onChange?.({ apiKeys: apiKeys.map((k, idx) => (idx === i ? val : k)) });
  }

  function outRef(key: string) {
    return (el: HTMLElement | null) => {
      // eslint-disable-next-line react-hooks/refs
      if (el) outputRefs.current.set(key, el);
      else outputRefs.current.delete(key);
    };
  }

  const dot     = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400";
  const dotRed  = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-red-400";
  const dotGray = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-80 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-emerald-500/50 shadow-emerald-900/20" : "border-white/[0.08]"
      )}
    >
      {/* Token input handle */}
      <Handle
        type="target"
        id="token"
        position={Position.Left}
        style={{ top: TOKEN_HANDLE_TOP }}
        className={dot}
      />
      <Handle type="target" id="tokenSource" position={Position.Left} style={{ top: tops.tokenSource ?? 0 }} className={dotGray} />
      {mode === "jwt" && (
        <Handle type="target" id="secret" position={Position.Left} style={{ top: tops.secret ?? 0 }} className={dotGray} />
      )}

      {/* Output handles */}
      <Handle type="source" id="valid" position={Position.Right} style={{ top: tops.valid ?? 0 }} className={dot} />
      <Handle type="source" id="error" position={Position.Right} style={{ top: tops.error ?? 0 }} className={dotRed} />
      {mode === "jwt" && claims.map((c) => (
        <Handle
          key={c.id}
          type="source"
          id={c.id}
          position={Position.Right}
          style={{ top: tops[c.id] ?? 0 }}
          className={dot}
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1e2820] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Auth Validator</p>
          <p className="text-[11px] text-emerald-300/70 mt-0.5">
            {mode === "jwt" ? `JWT · ${algorithm}` : "API Key"}
          </p>
        </div>
        {/* Mode tabs */}
        <div className="flex rounded-md overflow-hidden border border-white/[0.08] shrink-0">
          {(["jwt", "apikey"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onChange?.({ mode: m })}
              className={cn(
                "px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                mode === m
                  ? "bg-emerald-600/50 text-emerald-200"
                  : "bg-[#252527] text-white/30 hover:text-white/60"
              )}
            >
              {m === "jwt" ? "JWT" : "Key"}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">

        {/* Token source */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Token source</p>
          <div ref={tokenSourceRef}>
            <VarField
              as="input"
              value={headerName}
              onChange={(v) => onChange?.({ headerName: v })}
              placeholder="Authorization"
              disabled={connected.has("tokenSource")}
              focusBorderClass="focus:border-emerald-500/40"
              typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
              textColorClass="text-white/80"
            />
          </div>
          <p className="text-[9px] text-white/20 mt-0.5">
            {connected.has("tokenSource") ? "using connected value" : "header to read the token from · connect to set dynamically"}
          </p>
        </div>

        {/* ── JWT config ─────────────────────────────────── */}
        {mode === "jwt" && (
          <>
            {/* Algorithm */}
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Algorithm</p>
              <div className="flex gap-1">
                {(["HS256", "RS256"] as const).map((alg) => (
                  <button
                    key={alg}
                    onClick={() => onChange?.({ algorithm: alg })}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-[10px] font-mono font-bold border transition-colors",
                      algorithm === alg
                        ? "bg-emerald-600/30 border-emerald-500/50 text-emerald-300"
                        : "bg-[#252527] border-white/[0.08] text-white/30 hover:text-white/60"
                    )}
                  >
                    {alg}
                  </button>
                ))}
              </div>
            </div>

            {/* HS256: secret */}
            {algorithm === "HS256" && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Secret</p>
                <div ref={secretRef}>
                  <VarField
                    as="input"
                    value={secret}
                    onChange={(v) => onChange?.({ secret: v })}
                    placeholder="your-jwt-secret or $MY_SECRET"
                    disabled={connected.has("secret")}
                    focusBorderClass="focus:border-emerald-500/40"
                    typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                    textColorClass="text-white/80"
                  />
                </div>
                {connected.has("secret") && (
                  <p className="text-[9px] text-white/20 mt-0.5">using connected value</p>
                )}
              </div>
            )}

            {/* RS256: JWKS URL */}
            {algorithm === "RS256" && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">JWKS URL</p>
                <div ref={secretRef}>
                  <VarField
                    as="input"
                    value={jwksUrl}
                    onChange={(v) => onChange?.({ jwksUrl: v })}
                    placeholder="https://your-issuer/.well-known/jwks.json"
                    disabled={connected.has("secret")}
                    focusBorderClass="focus:border-emerald-500/40"
                    typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                    textColorClass="text-white/80"
                  />
                </div>
                {connected.has("secret") && (
                  <p className="text-[9px] text-white/20 mt-0.5">using connected value</p>
                )}
              </div>
            )}

            {/* Claims */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Claims to extract</p>
              {claims.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5">
                  <VarField
                    as="input"
                    value={c.name}
                    onChange={(v) => updateClaim(c.id, v)}
                    placeholder="e.g. sub, email, roles"
                    focusBorderClass="focus:border-emerald-500/40"
                    typographyClass="text-[12px] px-2.5 py-1.5 font-mono"
                    textColorClass="text-white/90"
                    wrapperClass="flex-1 min-w-0"
                  />
                  <button
                    onClick={() => removeClaim(c.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={addClaim}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add claim
              </button>
            </div>
          </>
        )}

        {/* ── API key config ─────────────────────────────── */}
        {mode === "apikey" && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Valid API keys</p>
            {apiKeys.map((k, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <VarField
                  as="input"
                  value={k}
                  onChange={(v) => updateApiKey(i, v)}
                  placeholder="sk-… or $MY_API_KEY"
                  focusBorderClass="focus:border-emerald-500/40"
                  typographyClass="text-[12px] px-2.5 py-1.5 font-mono"
                  textColorClass="text-white/80"
                  wrapperClass="flex-1 min-w-0"
                />
                <button
                  onClick={() => removeApiKey(i)}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={addApiKey}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add key
            </button>
          </div>
        )}

        <div className="border-t border-white/[0.06]" />

        {/* Output rows */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Outputs</p>

          <div ref={outRef("valid")} className="flex items-center justify-end">
            <span className="text-[11px] font-mono text-white/50">valid</span>
          </div>

          <div ref={outRef("error")} className="flex items-center justify-end">
            <span className="text-[11px] font-mono text-white/50">error</span>
          </div>

          {mode === "jwt" && claims.map((c) => (
            <div
              key={c.id}
              ref={(el) => { if (el) outputRefs.current.set(c.id, el); else outputRefs.current.delete(c.id); }}
              className="flex items-center justify-end"
            >
              <span className="text-[11px] font-mono text-white/40 truncate max-w-[200px]">
                {c.name || "…"}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export const AuthValidatorNode = memo(AuthValidatorNodeComponent);
