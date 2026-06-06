"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check, Eye, EyeOff, Pencil, X, AlertTriangle, ShieldAlert } from "lucide-react";

interface GeneralTabProps {
  slug: string;
  name: string;
  isActive: boolean;
}

export function GeneralTab({ slug, name: initialName, isActive: initialActive }: GeneralTabProps) {
  const router = useRouter();

  // ── Name editing ──────────────────────────────────────────────
  const [name, setName]           = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === name) { setEditingName(false); return; }
    setSavingName(true);
    const res = await fetch(`/api/workflows/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      setName(trimmed);
      toast.success("Name updated");
    } else {
      toast.error("Failed to update name");
    }
    setSavingName(false);
    setEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") { setEditingName(false); setNameInput(name); }
  }

  // ── Management key ────────────────────────────────────────────
  const [mgmtKey, setMgmtKey]     = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    fetch("/api/account/api-key", { method: "POST" })
      .then((r) => r.json())
      .then((d: { api_key?: string }) => { if (d.api_key) setMgmtKey(d.api_key); })
      .catch(() => {});
  }, []);

  async function handleCopy() {
    if (!mgmtKey) return;
    await navigator.clipboard.writeText(mgmtKey);
    setCopied(true);
    toast.success("Management key copied");
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Active toggle ─────────────────────────────────────────────
  const [isActive, setIsActive]     = useState(initialActive);
  const [toggling, setToggling]     = useState(false);

  async function handleToggleActive() {
    setToggling(true);
    const next = !isActive;
    const res = await fetch(`/api/workflows/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    if (res.ok) {
      setIsActive(next);
      toast.success(next ? "Workflow activated" : "Workflow deactivated");
    } else {
      toast.error("Failed to update status");
    }
    setToggling(false);
  }

  // ── Error workflow ────────────────────────────────────────────
  const [workflowOptions, setWorkflowOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [errorWorkflowId, setErrorWorkflowId] = useState<number | null>(null);
  const [savedErrorWorkflowId, setSavedErrorWorkflowId] = useState<number | null>(null);
  const [savingErrorWf, setSavingErrorWf] = useState(false);

  useEffect(() => {
    // Available workflows for the picker — exclude this one (it cannot be its own error workflow).
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((rows: Array<{ id: number; slug: string; name: string }>) =>
        setWorkflowOptions(rows.filter((w) => w.slug !== slug).map((w) => ({ id: w.id, name: w.name }))))
      .catch(() => {});
    // Current assignment for this workflow.
    fetch(`/api/workflows/${slug}`)
      .then((r) => r.json())
      .then((d: { errorWorkflowId?: number | null }) => {
        const id = d.errorWorkflowId ?? null;
        setErrorWorkflowId(id);
        setSavedErrorWorkflowId(id);
      })
      .catch(() => {});
  }, [slug]);

  async function handleSaveErrorWorkflow() {
    setSavingErrorWf(true);
    const res = await fetch(`/api/workflows/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errorWorkflowId }),
    });
    if (res.ok) {
      setSavedErrorWorkflowId(errorWorkflowId);
      toast.success("Error workflow updated");
    } else {
      toast.error("Failed to update error workflow");
    }
    setSavingErrorWf(false);
  }

  // ── Delete ────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/workflows/${slug}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Workflow deleted");
      router.push("/workflow");
    } else {
      const data = await res.json() as { error?: string };
      toast.error(data.error ?? "Failed to delete workflow");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-8 w-full">

      {/* Name */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Workflow Name</h2>
        <div className="flex items-center gap-2">
          {editingName ? (
            <>
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleNameKeyDown}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !nameInput.trim()}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {savingName ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setEditingName(false); setNameInput(name); }}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-foreground">{name}</span>
              <button
                onClick={() => { setNameInput(name); setEditingName(true); }}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Edit name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Management Key */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
          <h2 className="text-sm font-semibold text-foreground">Management API Key</h2>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-amber-400">Do not share this key</p>
          <p className="text-xs text-amber-300/80">
            This key grants full control over your Sooket instance — workflows, provider keys, variables, and access lists. Treat it like a password. Use the <strong className="text-amber-300">API Keys</strong> tab to issue limited <code className="font-mono bg-amber-500/20 px-1 rounded">sk-wf-*</code> keys for callers.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2.5">
          <code className="flex-1 text-xs font-mono text-foreground truncate select-all">
            {mgmtKey
              ? (keyVisible ? mgmtKey : `sk-mw-${"•".repeat(24)}`)
              : "Loading…"}
          </code>
          <button
            onClick={() => setKeyVisible((v) => !v)}
            disabled={!mgmtKey}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-40"
            title={keyVisible ? "Hide" : "Reveal"}
          >
            {keyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={handleCopy}
            disabled={!mgmtKey}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-40"
            title="Copy"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Active status */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Status</h2>
        <p className="text-xs text-muted-foreground">
          Only one workflow can be active at a time. Activating this workflow deactivates all others.
        </p>
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isActive ? "Active" : "Inactive"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isActive ? "Receiving traffic on POST /api/v1/chat" : "Not receiving any traffic"}
            </p>
          </div>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive ? "bg-emerald-600" : "bg-input"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Error workflow */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Error Workflow</h2>
        <p className="text-xs text-muted-foreground">
          When this workflow fails with an unhandled error, the selected workflow runs as a handler.
          The error workflow receives the failure context as its input.
        </p>
        <div className="flex items-center gap-2">
          <select
            value={errorWorkflowId ?? ""}
            onChange={(e) => setErrorWorkflowId(e.target.value === "" ? null : Number(e.target.value))}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">None</option>
            {workflowOptions.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <button
            onClick={handleSaveErrorWorkflow}
            disabled={savingErrorWf || errorWorkflowId === savedErrorWorkflowId}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {savingErrorWf ? "Saving…" : "Save"}
          </button>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Danger zone */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
        {isActive ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              An active workflow cannot be deleted. Deactivate it first.
            </p>
          </div>
        ) : confirmDelete ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-4 space-y-3">
            <p className="text-sm font-medium text-destructive">Delete this workflow?</p>
            <p className="text-xs text-muted-foreground">
              This permanently removes the workflow, all its logs, access list entries, and variables. There is no undo.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Yes, delete permanently"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Delete workflow</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently remove this workflow and all its data</p>
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 rounded-md border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </section>

    </div>
  );
}
