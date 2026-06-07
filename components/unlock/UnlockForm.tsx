"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Single shared-secret unlock form. POSTs the token to /api/unlock, which sets
 * the httpOnly cookie the proxy gate checks, then navigates to the original
 * destination. Not a user-account login — one shared password per instance.
 */
export function UnlockForm({ next }: { next: string }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        // Full navigation so the new cookie is sent on the next request.
        window.location.assign(next || "/workflow");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Unlock failed");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="token">Access token</Label>
        <Input
          id="token"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter the instance secret"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading || token.length === 0}>
        {loading ? "Unlocking…" : "Unlock"}
      </Button>
    </form>
  );
}
