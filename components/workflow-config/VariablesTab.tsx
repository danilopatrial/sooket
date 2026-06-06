"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound } from "lucide-react";
import { useVariables } from "@/lib/variables-context";

const NAME_RE = /^[A-Z][A-Z0-9_]*$/;

interface VarRow {
  name: string;
  created_at: string;
}

interface PendingRow {
  id: string;
  name: string;
  value: string;
  nameError: string;
}

function makeRow(): PendingRow {
  return { id: Math.random().toString(36).slice(2), name: "", value: "", nameError: "" };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + "Z").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

interface VariablesTabProps {
  slug: string;
}

export function VariablesTab({ slug }: VariablesTabProps) {
  const { refresh } = useVariables();

  const [vars, setVars]           = useState<VarRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [confirmName, setConfirmName]   = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [rows, setRows]           = useState<PendingRow[]>([makeRow()]);
  const [saving, setSaving]       = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/workflows/${slug}/variables`);
    if (res.ok) {
      const data = await res.json() as VarRow[];
      setVars(data);
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const saved  = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    if (saved.length > 0) {
      toast.success(saved.length === 1 ? `$${saved[0].name} saved` : `${saved.length} variables saved`);
      const savedNames = new Set(saved.map((r) => r.name));
      setRows((prev) => {
        const remaining = prev.filter((r) => !savedNames.has(r.name));
        return remaining.length > 0 ? remaining : [makeRow()];
      });
      await load();
      refresh();
    }
    for (const f of failed) toast.error(`$${f.name}: ${f.error}`);

    setSaving(false);
  }

  async function handleDelete(name: string) {
    setDeletingName(name);
    const res = await fetch(`/api/workflows/${slug}/variables?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success(`$${name} deleted`);
      setVars((prev) => prev.filter((v) => v.name !== name));
      refresh();
    } else {
      toast.error("Failed to delete variable");
    }
    setDeletingName(null);
    setConfirmName(null);
  }

  const canSave = rows.some((r) => r.name && r.value && !r.nameError);

  return (
    <div className="space-y-6 w-full">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-violet-600/20 flex items-center justify-center shrink-0">
          <KeyRound className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Variables</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reference in any text field with <code className="font-mono bg-muted px-1 rounded">$VAR_NAME</code>. Values are AES-encrypted and never exposed to the frontend.
          </p>
        </div>
      </div>

      {/* Existing variables */}
      {loading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
      ) : vars.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <KeyRound className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No variables yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add your first variable below</p>
        </div>
      ) : (
        <div className="rounded-md border border-border divide-y divide-border">
          {vars.map((v) => (
            <div key={v.name} className="flex items-center gap-3 px-3 py-3">
              <span className="text-sm font-mono text-violet-400 shrink-0">$</span>
              <span className="flex-1 min-w-0 text-sm font-mono text-foreground truncate">{v.name}</span>
              <span className="shrink-0 text-xs font-mono text-muted-foreground">••••••••</span>
              <span className="shrink-0 text-xs text-muted-foreground hidden sm:block">{formatDate(v.created_at)}</span>
              {confirmName === v.name ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Delete?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(v.name)}
                    disabled={deletingName === v.name}
                    className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {deletingName === v.name ? "Deleting…" : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmName(null)}
                    disabled={deletingName === v.name}
                    className="text-xs px-2 py-1 rounded hover:bg-accent transition-colors text-muted-foreground"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmName(v.name)}
                  className="shrink-0 h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  title={`Delete $${v.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new variables */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Variables</p>

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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, makeRow()])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add row
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

    </div>
  );
}
