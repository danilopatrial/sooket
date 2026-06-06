"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Workflow {
  id: number;
  name: string;
  slug: string;
  is_active: number;
  created_at: string;
}

export function WorkflowList({ workflows: initial }: { workflows: Workflow[] }) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initial);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(slug: string) {
    setDeleting(slug);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Delete failed");
        return;
      }
      setWorkflows((prev) => prev.filter((w) => w.slug !== slug));
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setDeleting(null);
      setConfirmSlug(null);
    }
  }

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <p className="text-muted-foreground text-sm">No workflows yet.</p>
        <p className="text-muted-foreground text-xs">Create your first workflow to get started.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      {workflows.map((wf) => {
        const isConfirming = confirmSlug === wf.slug;
        const isDeleting = deleting === wf.slug;
        const isActive = Boolean(wf.is_active);

        return (
          <li key={wf.id} className="flex items-stretch rounded-lg border border-border overflow-hidden">
            <Link
              href={`/workflow/${wf.slug}`}
              className="flex flex-1 items-center justify-between bg-card px-4 py-3 hover:bg-accent transition-colors min-w-0"
            >
              <div className="space-y-0.5 min-w-0 mr-4">
                <p className="text-sm font-medium truncate">{wf.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{wf.slug}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {new Date(wf.created_at).toLocaleDateString()}
                </span>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Link>

            {/* Delete control — sibling of Link so clicks don't navigate */}
            {!isActive && (
              <div className="flex items-center bg-card border-l border-border shrink-0">
                {isConfirming ? (
                  <div className="flex items-center gap-1.5 px-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Delete?</span>
                    <button
                      type="button"
                      onClick={() => { setError(null); handleDelete(wf.slug); }}
                      disabled={isDeleting}
                      className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isDeleting ? "Deleting…" : "Yes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConfirmSlug(null); setError(null); }}
                      className="text-xs px-2 py-1 rounded hover:bg-accent transition-colors text-muted-foreground"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setConfirmSlug(wf.slug); setError(null); }}
                    className="h-full px-3 flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete workflow"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
