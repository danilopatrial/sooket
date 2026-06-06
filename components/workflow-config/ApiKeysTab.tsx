"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, Copy, Check, Key, ToggleLeft, ToggleRight, AlertTriangle, BarChart2 } from "lucide-react";
import { KeyDashboardPanel } from "./KeyDashboardPanel";

interface ApiKey {
  id: number;
  label: string;
  key_hint: string;
  scopes: string[];
  rate_limit_override: number | null;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  // Only present immediately after creation
  key?: string;
}

interface ApiKeysTabProps {
  slug: string;
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

function ScopesBadge({ scopes }: { scopes: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {scopes.map((s) => (
        <span
          key={s}
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-sky-500/15 text-sky-400 border-sky-500/30"
        >
          {s}
        </span>
      ))}
    </span>
  );
}

function NewKeyReveal({ apiKey, onDismiss }: { apiKey: ApiKey; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!apiKey.key) return;
    await navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    toast.success("API key copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-400">Key created — save it now</p>
          <p className="text-xs text-emerald-300/80 mt-0.5">
            This is the only time you will see this key. It cannot be retrieved after you dismiss this.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-background/60 px-3 py-2">
        <code className="flex-1 text-xs font-mono text-foreground truncate select-all">
          {visible ? apiKey.key : `sk-wf-${"•".repeat(28)}`}
        </code>
        <button
          onClick={() => setVisible((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={visible ? "Hide" : "Reveal"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Copy"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        I have saved it — dismiss
      </button>
    </div>
  );
}

export function ApiKeysTab({ slug }: ApiKeysTabProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);

  // Create form state
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  // Per-key state
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [dashboardKey, setDashboardKey] = useState<ApiKey | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/workflows/${slug}/api-keys`);
    if (res.ok) {
      const { keys: k } = await res.json() as { keys: ApiKey[] };
      setKeys(k);
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    setCreating(true);
    const body: Record<string, unknown> = { label: trimmedLabel, scopes: ["execute"] };
    if (expiresAt) body.expires_at = new Date(expiresAt).toISOString();

    const res = await fetch(`/api/workflows/${slug}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const { key } = await res.json() as { key: ApiKey };
      setNewKey(key);
      setKeys((prev) => [...prev, { ...key, key: undefined }]);
      setLabel("");
      setExpiresAt("");
      toast.success(`Key "${key.label}" created`);
    } else {
      const data = await res.json() as { error?: string };
      toast.error(data.error ?? "Failed to create key");
    }
    setCreating(false);
  }

  async function handleToggle(key: ApiKey) {
    setTogglingId(key.id);
    const res = await fetch(`/api/workflows/${slug}/api-keys/${key.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !key.is_active }),
    });
    if (res.ok) {
      const { key: updated } = await res.json() as { key: ApiKey };
      setKeys((prev) => prev.map((k) => k.id === key.id ? { ...k, ...updated } : k));
      toast.success(updated.is_active ? "Key enabled" : "Key disabled");
    } else {
      const data = await res.json() as { error?: string };
      toast.error(data.error ?? "Failed to update key");
    }
    setTogglingId(null);
  }

  async function handleDelete(key: ApiKey) {
    setDeletingId(key.id);
    const res = await fetch(`/api/workflows/${slug}/api-keys/${key.id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
      setConfirmDeleteId(null);
      toast.success(`Key "${key.label}" deleted`);
    } else {
      const data = await res.json() as { error?: string };
      toast.error(data.error ?? "Failed to delete key");
    }
    setDeletingId(null);
  }

  const isExpired = (key: ApiKey) =>
    !!key.expires_at && new Date(key.expires_at) <= new Date();

  return (
    <div className="space-y-6 w-full">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-sky-600/20 flex items-center justify-center shrink-0">
          <Key className="h-4 w-4 text-sky-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">API Keys</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issue multiple keys to different consumers. Each key is independent — revoke one without affecting others.
          </p>
        </div>
      </div>

      {/* New-key reveal */}
      {newKey && (
        <NewKeyReveal
          apiKey={newKey}
          onDismiss={() => setNewKey(null)}
        />
      )}

      {/* Create form */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Create New Key</p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Label <span className="text-destructive">*</span></label>
            <input
              type="text"
              placeholder="e.g. production-app, partner-acme"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Expires (optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">Scope:</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-sky-500/15 text-sky-400 border-sky-500/30">execute</span>
          </div>
          <button
            type="submit"
            disabled={creating || !label.trim()}
            className="flex items-center justify-center gap-1.5 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {creating ? "Creating…" : "Create key"}
          </button>
        </form>
      </div>

      {/* Keys list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
        ) : keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <Key className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No keys yet</p>
          </div>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border">
            {keys.map((key) => (
              <div key={key.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  {/* Active toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggle(key)}
                    disabled={togglingId === key.id}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    title={key.is_active ? "Disable key" : "Enable key"}
                  >
                    {key.is_active
                      ? <ToggleRight className="h-5 w-5 text-emerald-400" />
                      : <ToggleLeft className="h-5 w-5" />
                    }
                  </button>

                  {/* Label + hint */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${!key.is_active ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {key.label}
                      </span>
                      <ScopesBadge scopes={key.scopes} />
                      {isExpired(key) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-destructive/15 text-destructive border-destructive/30">
                          Expired
                        </span>
                      )}
                    </div>
                    <code className="text-[11px] font-mono text-muted-foreground">{key.key_hint}</code>
                  </div>

                  {/* Stats */}
                  <button
                    type="button"
                    onClick={() => setDashboardKey(key)}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                    title="View usage stats"
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  {confirmDeleteId === key.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(key)}
                        disabled={deletingId === key.id}
                        className="px-2 py-1 rounded text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 transition-colors"
                      >
                        {deletingId === key.id ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded text-xs border border-border text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(key.id)}
                      disabled={deletingId === key.id}
                      className="shrink-0 h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                      title={`Delete "${key.label}"`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Metadata row */}
                <div className="flex items-center gap-4 pl-8 text-[11px] text-muted-foreground/70">
                  <span>Created {relativeTime(key.created_at)}</span>
                  <span>Last used: {relativeTime(key.last_used_at)}</span>
                  {key.expires_at && (
                    <span className={isExpired(key) ? "text-destructive" : ""}>
                      Expires {new Date(key.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {keys.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {keys.length} {keys.length === 1 ? "key" : "keys"} total ·{" "}
          {keys.filter((k) => k.is_active).length} active
        </p>
      )}

      {dashboardKey && (
        <KeyDashboardPanel
          slug={slug}
          apiKey={dashboardKey}
          onClose={() => setDashboardKey(null)}
        />
      )}
    </div>
  );
}
