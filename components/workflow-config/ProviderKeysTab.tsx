"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Cpu } from "lucide-react";

interface ProviderKeysTabProps {
  slug: string;
  hasAnthropicKey: boolean;
}

export function ProviderKeysTab({ slug, hasAnthropicKey: initialHasKey }: ProviderKeysTabProps) {
  const [hasKey, setHasKey]           = useState(initialHasKey);
  const [keyInput, setKeyInput]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [removing, setRemoving]       = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/workflows/${slug}/provider-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", key: keyInput.trim() }),
    });
    if (res.ok) {
      toast.success("Anthropic key saved");
      setKeyInput("");
      setHasKey(true);
    } else {
      const data = await res.json() as { error?: string };
      toast.error(data.error ?? "Failed to save key");
    }
    setSaving(false);
  }

  async function handleRemove() {
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
    <div className="space-y-6 w-full">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-sky-600/20 flex items-center justify-center shrink-0">
          <Cpu className="h-4 w-4 text-sky-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Provider Keys</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Per-workflow keys override the global provider keys set in Account settings. Stored AES-encrypted.
          </p>
        </div>
      </div>

      {/* Anthropic */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Anthropic</p>
            <p className="text-xs text-muted-foreground mt-0.5">Used by the Anthropic node in this workflow</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
            hasKey
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            {hasKey ? "Configured" : "Not set"}
          </span>
        </div>

        {hasKey && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
            <code className="flex-1 text-xs font-mono text-muted-foreground">sk-ant-••••••••••••••••••••••</code>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-2">
          <input
            type="password"
            placeholder={hasKey ? "Enter new key to replace…" : "sk-ant-…"}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !keyInput.trim()}
              className="flex-1 rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : hasKey ? "Replace key" : "Save key"}
            </button>
            {hasKey && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="flex-1 rounded-md border border-destructive/40 text-destructive text-sm font-medium py-2 hover:bg-destructive/10 disabled:opacity-50 transition-colors"
              >
                {removing ? "Removing…" : "Remove key"}
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}
