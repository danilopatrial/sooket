"use client";

import { useState, useEffect } from "react";
import { X, Activity, Zap, Clock, TrendingUp } from "lucide-react";

interface KeyStats {
  period_days: number;
  total_requests: number;
  total_requests_all_time: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  daily: Array<{ day: string; requests: number }>;
}

interface ApiKeyMeta {
  id: number;
  label: string;
  key_hint: string;
  scopes: string[];
  rate_limit_override: number | null;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface KeyDashboardPanelProps {
  slug: string;
  apiKey: ApiKeyMeta;
  onClose: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function BarChart({ daily }: { daily: Array<{ day: string; requests: number }> }) {
  const max = Math.max(...daily.map((d) => d.requests), 1);
  const W = 560;
  const H = 80;
  const barW = Math.floor(W / daily.length) - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {daily.map((d, i) => {
        const barH = Math.max((d.requests / max) * H, d.requests > 0 ? 2 : 0);
        const x = i * (barW + 2);
        const y = H - barH;
        return (
          <g key={d.day}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={2}
              className="fill-sky-500/70"
            />
            {d.requests > 0 && (
              <title>{`${d.day}: ${d.requests} request${d.requests !== 1 ? "s" : ""}`}</title>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function KeyDashboardPanel({ slug, apiKey, onClose }: KeyDashboardPanelProps) {
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/workflows/${slug}/api-keys/${apiKey.id}/stats`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<KeyStats>;
      })
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug, apiKey.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isExpired = apiKey.expires_at && new Date(apiKey.expires_at) <= new Date();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-40 h-full w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground">{apiKey.label}</h2>
              {!apiKey.is_active && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-muted text-muted-foreground border-border">
                  Disabled
                </span>
              )}
              {isExpired && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-destructive/15 text-destructive border-destructive/30">
                  Expired
                </span>
              )}
            </div>
            <code className="text-[11px] font-mono text-muted-foreground">{apiKey.key_hint}</code>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Key metadata */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Created</p>
              <p className="text-foreground">{new Date(apiKey.created_at).toLocaleDateString()}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Last used</p>
              <p className="text-foreground">{relativeTime(apiKey.last_used_at)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Expires</p>
              <p className={`${isExpired ? "text-destructive" : "text-foreground"}`}>
                {apiKey.expires_at ? new Date(apiKey.expires_at).toLocaleDateString() : "Never"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Rate limit</p>
              <p className="text-foreground">
                {apiKey.rate_limit_override != null ? `${apiKey.rate_limit_override} req/min` : "None"}
              </p>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Stats — last 30 days */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Last 30 days
            </p>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-lg border border-border bg-card h-24 animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-muted-foreground text-center py-4">Failed to load stats</p>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={Activity}
                    label="Requests"
                    value={formatNumber(stats.total_requests)}
                    sub={`${formatNumber(stats.total_requests_all_time)} all time`}
                    color="bg-sky-500/20 text-sky-400"
                  />
                  <StatCard
                    icon={Zap}
                    label="Tokens used"
                    value={formatNumber(stats.total_tokens)}
                    sub={`${formatNumber(stats.total_input_tokens)} in · ${formatNumber(stats.total_output_tokens)} out`}
                    color="bg-violet-500/20 text-violet-400"
                  />
                  <StatCard
                    icon={Clock}
                    label="Avg latency"
                    value={formatMs(stats.avg_latency_ms)}
                    sub={stats.avg_latency_ms > 0 ? `${formatMs(stats.min_latency_ms)} – ${formatMs(stats.max_latency_ms)}` : undefined}
                    color="bg-amber-500/20 text-amber-400"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Peak day"
                    value={formatNumber(Math.max(...stats.daily.map((d) => d.requests)))}
                    sub={stats.daily.find((d) => d.requests === Math.max(...stats.daily.map((x) => x.requests)))?.day ?? "—"}
                    color="bg-emerald-500/20 text-emerald-400"
                  />
                </div>

                {/* Bar chart */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Daily requests</p>
                    <p className="text-[11px] text-muted-foreground">
                      {stats.daily[0]?.day} → {stats.daily[stats.daily.length - 1]?.day}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <BarChart daily={stats.daily} />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
