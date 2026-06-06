"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, Check, Eye, EyeOff, Settings2, Trash2, Plus, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useVariables } from "@/lib/variables-context";

interface WorkflowConfigProps {
  slug: string;
  apiKey: string;
  hasAnthropicKey: boolean;
}

const NAME_RE = /^[A-Z][A-Z0-9_]*$/;

// ─── Provider key section ─────────────────────────────────────────────────

function ProviderKeySection({ slug, hasAnthropicKey }: { slug: string; hasAnthropicKey: boolean }) {
  const [anthropicInput, setAnthropicInput] = useState("");
  const [hasKey, setHasKey] = useState(hasAnthropicKey);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!anthropicInput.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/workflows/${slug}/provider-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", key: anthropicInput.trim() }),
    });
    if (res.ok) {
      toast.success("Anthropic key saved");
      setAnthropicInput("");
      setHasKey(true);
    } else {
      const { error } = await res.json();
      toast.error(error ?? "Failed to save key");
    }
    setSaving(false);
  }

  async function handleRemoveKey() {
    setRemoving(true);
    const res = await fetch(`/api/workflows/${slug}/provider-keys?provider=anthropic`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Anthropic key removed");
      setHasKey(false);
    } else {
      toast.error("Failed to remove key");
    }
    setRemoving(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Anthropic API Key
      </p>
      {hasKey && (
        <p className="text-xs text-muted-foreground font-mono">sk-ant-••••••••••••••••</p>
      )}
      <form onSubmit={handleSaveKey} className="flex flex-col gap-2">
        <input
          type="password"
          placeholder={hasKey ? "Enter new key to replace…" : "sk-ant-…"}
          value={anthropicInput}
          onChange={(e) => setAnthropicInput(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || (mounted && !anthropicInput.trim())}
            className="flex-1 rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {hasKey && (
            <button
              type="button"
              onClick={handleRemoveKey}
              disabled={removing}
              className="flex-1 rounded-md border border-destructive/40 text-destructive text-sm font-medium py-2 hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Variables section ────────────────────────────────────────────────────

interface PendingRow {
  id: string;
  name: string;
  value: string;
  nameError: string;
}

function makeRow(): PendingRow {
  return { id: Math.random().toString(36).slice(2), name: "", value: "", nameError: "" };
}

function VariablesSection({ slug }: { slug: string }) {
  const { names, refresh } = useVariables();
  const [rows, setRows] = useState<PendingRow[]>([makeRow()]);
  const [saving, setSaving] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  function updateRow(id: string, field: "name" | "value", raw: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "name") {
          const v = raw.toUpperCase().replace(/[^A-Z0-9_]/g, "");
          const nameError = v && !NAME_RE.test(v) ? "Must start with a letter (e.g. MY_KEY)" : "";
          return { ...r, name: v, nameError };
        }
        return { ...r, value: raw };
      })
    );
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length === 1 ? [makeRow()] : prev.filter((r) => r.id !== id)));
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.name && r.value && !r.nameError);
    if (valid.length === 0) return;
    setSaving(true);

    const results = await Promise.all(
      valid.map((r) =>
        fetch(`/api/workflows/${slug}/variables`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: r.name, value: r.value }),
        }).then(async (res) => ({
          name: r.name,
          ok: res.ok,
          error: res.ok ? null : ((await res.json()) as { error?: string }).error ?? "Failed",
        }))
      )
    );

    const saved = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    if (saved.length > 0) {
      toast.success(
        saved.length === 1 ? `$${saved[0].name} saved` : `${saved.length} variables saved`
      );
    }
    for (const f of failed) {
      toast.error(`$${f.name}: ${f.error}`);
    }

    if (saved.length > 0) {
      const savedNames = new Set(saved.map((r) => r.name));
      // Remove successfully saved rows; keep failed ones so user can fix them
      setRows((prev) => {
        const remaining = prev.filter((r) => !savedNames.has(r.name));
        return remaining.length > 0 ? remaining : [makeRow()];
      });
      refresh();
    }

    setSaving(false);
  }

  async function handleDelete(name: string) {
    setDeletingName(name);
    const res = await fetch(`/api/workflows/${slug}/variables?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success(`$${name} deleted`);
      refresh();
    } else {
      toast.error("Failed to delete variable");
    }
    setDeletingName(null);
  }

  const canSave = rows.some((r) => r.name && r.value && !r.nameError);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Variables
      </p>
      <p className="text-xs text-muted-foreground">
        Reference in any text field with <code className="font-mono bg-muted px-1 rounded">$VAR_NAME</code>. Values are encrypted and never exposed to the frontend.
      </p>

      {/* Existing variables */}
      {names.length > 0 && (
        <div className="rounded-md border border-border divide-y divide-border">
          {names.map((name) => (
            <div key={name} className="flex items-center justify-between px-3 py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-violet-400 shrink-0">$</span>
                <span className="text-xs font-mono text-foreground truncate">{name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-muted-foreground">••••••••</span>
                <button
                  type="button"
                  onClick={() => handleDelete(name)}
                  disabled={deletingName === name}
                  className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  title={`Delete $${name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending rows */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="space-y-1">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="MY_SECRET_KEY"
                value={row.name}
                onChange={(e) => updateRow(row.id, "name", e.target.value)}
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                type="password"
                placeholder="secret value"
                value={row.value}
                onChange={(e) => updateRow(row.id, "value", e.target.value)}
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Remove row"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {row.nameError && <p className="text-xs text-destructive pl-1">{row.nameError}</p>}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add variable
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className="flex-1 rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Access List section ──────────────────────────────────────────────────

interface AccessEntry { id: number; value: string; label: string }

function AccessListSection({ slug }: { slug: string }) {
  const [entries, setEntries]   = useState<AccessEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [valueInput, setValueInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [adding, setAdding]     = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/workflows/${slug}/access-list`);
    if (res.ok) {
      const { entries: e } = await res.json();
      setEntries(e);
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = valueInput.trim();
    if (!value) return;
    setAdding(true);
    const res = await fetch(`/api/workflows/${slug}/access-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, label: labelInput.trim() }),
    });
    if (res.ok) {
      toast.success(`"${value}" added`);
      setValueInput("");
      setLabelInput("");
      await load();
    } else {
      const { error } = await res.json();
      toast.error(error ?? "Failed to add entry");
    }
    setAdding(false);
  }

  async function handleDelete(id: number, value: string) {
    setDeletingId(id);
    const res = await fetch(`/api/workflows/${slug}/access-list?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`"${value}" removed`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } else {
      toast.error("Failed to remove entry");
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Access List
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Values checked at runtime by any Access List node in this workflow. Comparison is case-insensitive.
      </p>

      {/* Existing entries */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : entries.length > 0 ? (
        <div className="rounded-md border border-border divide-y divide-border">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-3 py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-foreground truncate">{entry.value}</span>
                {entry.label && (
                  <span className="text-xs text-muted-foreground truncate">{entry.label}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(entry.id, entry.value)}
                disabled={deletingId === entry.id}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 shrink-0"
                title={`Remove "${entry.value}"`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No entries yet.</p>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="value (e.g. 192.168.1.1)"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            placeholder="label (optional)"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !valueInput.trim()}
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {adding ? "Adding…" : "Add entry"}
        </button>
      </form>
    </div>
  );
}

// ─── Config panel ─────────────────────────────────────────────────────────

function ConfigPanel({ slug, apiKey, hasAnthropicKey }: WorkflowConfigProps) {
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Workflow API Key */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Workflow API Key
        </p>
        <div className="flex items-center gap-2 bg-muted rounded-lg border border-border px-3 py-2">
          <code className="flex-1 text-xs font-mono text-foreground truncate select-all">
            {keyVisible ? apiKey : `sk-wf-${"•".repeat(24)}`}
          </code>
          <button
            onClick={() => setKeyVisible((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title={keyVisible ? "Hide" : "Reveal"}
          >
            {keyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Copy"
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-emerald-500" />
              : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <ProviderKeySection slug={slug} hasAnthropicKey={hasAnthropicKey} />

      <div className="border-t border-border" />

      <AccessListSection slug={slug} />

      <div className="border-t border-border" />

      <VariablesSection slug={slug} />
    </div>
  );
}

export function WorkflowConfig(props: WorkflowConfigProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            title="Workflow settings"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
          />
        }
      >
        <Settings2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Workflow Configuration</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-1">
          <ConfigPanel {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
