"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProviderKeyFormProps {
  provider: string;
  label: string;
  hasExistingKey: boolean;
}

export function ProviderKeyForm({ provider, label, hasExistingKey }: ProviderKeyFormProps) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasKey, setHasKey] = useState(hasExistingKey);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!key.trim()) return;
    setSaving(true);
    const res = await fetch("/api/provider-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key: key.trim() }),
    });
    if (res.ok) {
      toast.success(`${label} saved`);
      setKey("");
      setHasKey(true);
    } else {
      const { error } = await res.json();
      toast.error(error ?? "Failed to save key");
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/provider-keys?provider=${provider}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success(`${label} removed`);
      setHasKey(false);
    } else {
      toast.error("Failed to remove key");
    }
    setDeleting(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <Label htmlFor={`key-${provider}`}>{label}</Label>
      {hasKey && (
        <p className="text-sm text-muted-foreground font-mono">
          ant…••••••••••••••
        </p>
      )}
      <div className="flex gap-2">
        <Input
          id={`key-${provider}`}
          type="password"
          placeholder={hasKey ? "Enter new key to replace" : "sk-ant-…"}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="font-mono"
        />
        <Button type="submit" disabled={saving || (mounted && !key.trim())}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {hasKey && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Removing…" : "Remove"}
          </Button>
        )}
      </div>
    </form>
  );
}
