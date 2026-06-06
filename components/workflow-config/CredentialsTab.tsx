"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, Link2, LinkIcon } from "lucide-react";

interface Credential {
  id: number;
  name: string;
  type: string;
  createdAt: string;
}

interface NodeAssignment {
  nodeId: string;
  credentialId: number;
  name: string;
  type: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  data: { label?: string };
}

interface CredentialsTabProps {
  slug: string;
}

const CREDENTIAL_TYPES = [
  "api-key",
  "bearer-token",
  "basic-auth",
  "anthropic",
  "openai",
  "custom",
];

export function CredentialsTab({ slug }: CredentialsTabProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [assignments, setAssignments] = useState<NodeAssignment[]>([]);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("api-key");
  const [newKey, setNewKey] = useState("");
  const [creating, setCreating] = useState(false);

  // Assignment form
  const [assignNodeId, setAssignNodeId] = useState("");
  const [assignCredId, setAssignCredId] = useState<number | "">("");
  const [assigning, setAssigning] = useState(false);

  const [fetchTick, setFetchTick] = useState(0);

  const loadAll = useCallback(() => {
    setLoading(true);
    setFetchTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/credentials").then((r) => r.json()),
      fetch(`/api/workflows/${slug}/credentials`).then((r) => r.json()),
      fetch(`/api/workflows/${slug}`).then((r) => r.json()),
    ])
      .then(([creds, assigns, wf]: [Credential[], NodeAssignment[], { nodes: WorkflowNode[] }]) => {
        if (cancelled) return;
        setCredentials(creds ?? []);
        setAssignments(assigns ?? []);
        setNodes((wf.nodes ?? []).filter((n: WorkflowNode) => n.type !== "workflowInput" && n.type !== "workflowOutput"));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Failed to load credentials");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug, fetchTick]);

  async function handleCreate() {
    if (!newName.trim() || !newKey.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), type: newType, key: newKey.trim() }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        toast.error(j.error ?? "Failed to create credential");
        return;
      }
      toast.success("Credential saved");
      setNewName(""); setNewType("api-key"); setNewKey("");
      setShowCreate(false);
      loadAll();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/credentials?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Credential deleted"); loadAll(); }
    else toast.error("Failed to delete");
  }

  async function handleAssign() {
    if (!assignNodeId || assignCredId === "") return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/workflows/${slug}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: assignNodeId, credentialId: Number(assignCredId) }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        toast.error(j.error ?? "Failed to assign");
        return;
      }
      toast.success("Credential assigned");
      setAssignNodeId(""); setAssignCredId("");
      loadAll();
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(nodeId: string) {
    const res = await fetch(`/api/workflows/${slug}/credentials?nodeId=${encodeURIComponent(nodeId)}`, { method: "DELETE" });
    if (res.ok) { toast.success("Assignment removed"); loadAll(); }
    else toast.error("Failed to remove assignment");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      {/* ── Global Credentials Pool ──────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Credentials Pool</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Shared credentials available to all workflows.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>

        {showCreate && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="My API Key"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  {CREDENTIAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Secret value</label>
              <input
                type="password"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="sk-…"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newKey.trim()}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {creating ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {credentials.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No credentials yet. Add one to share API keys across workflows.
          </div>
        ) : (
          <div className="space-y-2">
            {credentials.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.type}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                  title="Delete credential"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Node Assignments ─────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Node Assignments</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Map a credential to a specific node in this workflow.</p>
        </div>

        {nodes.length > 0 && credentials.length > 0 && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assign credential to node</p>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={assignNodeId}
                onChange={(e) => setAssignNodeId(e.target.value)}
              >
                <option value="">— select node —</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.type} ({n.id.slice(0, 8)})</option>
                ))}
              </select>
              <select
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={assignCredId}
                onChange={(e) => setAssignCredId(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">— select credential —</option>
                {credentials.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || !assignNodeId || assignCredId === ""}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" />
                {assigning ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        )}

        {assignments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No assignments yet.{nodes.length === 0 ? " Add nodes to the canvas first." : ""}
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.nodeId} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium font-mono">{a.nodeId}</p>
                    <p className="text-xs text-muted-foreground">{a.name} ({a.type})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnassign(a.nodeId)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                  title="Remove assignment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
