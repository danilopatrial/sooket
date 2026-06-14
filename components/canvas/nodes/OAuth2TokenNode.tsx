"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
export type { OAuth2TokenNodeData } from "@/lib/node-types";
import type { OAuth2TokenNodeData } from "@/lib/node-types";

function field(
  label: string,
  value: string,
  placeholder: string,
  onChange: (v: string) => void,
) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                   text-[11px] text-white/80 placeholder:text-white/20 font-mono
                   focus:outline-none focus:border-violet-500/50"
      />
    </div>
  );
}

function OAuth2TokenNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as OAuth2TokenNodeData;
  const tokenUrl = d.tokenUrl ?? "";
  const clientId = d.clientId ?? "";
  const clientSecret = d.clientSecret ?? "";
  const scope = d.scope ?? "";
  const authStyle = d.authStyle === "basic" ? "basic" : "body";

  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";

  return (
    <div
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-violet-500/50 shadow-violet-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="source" id="token" position={Position.Right} className={mainHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-violet-700 flex items-center justify-center shrink-0">
          <KeyRound className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">OAuth2 Token</p>
          <p className="text-[11px] text-violet-300/70 mt-0.5 font-mono truncate">
            client_credentials · {authStyle}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 nodrag">
        {field("Token URL", tokenUrl, "https://issuer/oauth/token", (v) => d.onChange?.({ tokenUrl: v }))}
        {field("Client ID", clientId, "$OAUTH_CLIENT_ID", (v) => d.onChange?.({ clientId: v }))}
        {field("Client Secret", clientSecret, "$OAUTH_CLIENT_SECRET", (v) => d.onChange?.({ clientSecret: v }))}
        {field("Scope", scope, "read write (optional)", (v) => d.onChange?.({ scope: v }))}

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">Credentials In</label>
          <select
            value={authStyle}
            onChange={(e) => d.onChange?.({ authStyle: e.target.value as "body" | "basic" })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1
                       text-[12px] text-white/80 focus:outline-none focus:border-violet-500/50"
          >
            <option value="body">Request body</option>
            <option value="basic">Basic auth header</option>
          </select>
        </div>

        <p className="text-[9px] text-white/20 leading-relaxed">
          Cached until expiry. Use the token downstream as{" "}
          <span className="font-mono text-white/40">Bearer {"{{ $node.<id> }}"}</span>.
        </p>

        <div className="border-t border-white/[0.06]" />

        {/* output row */}
        <div className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">access_token</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-violet-300/70">token</span>
        </div>
      </div>
    </div>
  );
}

export const OAuth2TokenNode = memo(OAuth2TokenNodeComponent);
