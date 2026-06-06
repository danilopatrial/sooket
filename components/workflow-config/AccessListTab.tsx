"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Search, Shield } from "lucide-react";

type RuleType = "value" | "ip" | "cidr" | "header";

interface AccessEntry {
  id: number;
  value: string;
  label: string;
  rule_type: RuleType;
  created_at: string;
}

const RULE_TYPE_META: Record<RuleType, { label: string; color: string; placeholder: string; hint: string }> = {
  value:  { label: "Value",  color: "bg-sky-500/15 text-sky-400 border-sky-500/30",    placeholder: "exact-match-string",  hint: "Case-insensitive exact match" },
  ip:     { label: "IP",     color: "bg-violet-500/15 text-violet-400 border-violet-500/30", placeholder: "192.168.1.1",     hint: "IPv4 or IPv6 address" },
  cidr:   { label: "CIDR",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30",   placeholder: "10.0.0.0/8",      hint: "CIDR notation (display only — matched as-is)" },
  header: { label: "Header", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", placeholder: "Bearer my-token", hint: "Header value to match" },
};

function RuleTypeBadge({ type }: { type: RuleType }) {
  const meta = RULE_TYPE_META[type] ?? RULE_TYPE_META.value;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${meta.color}`}>
      {meta.label}
    </span>
  );
}

interface AccessListTabProps {
  slug: string;
}

export function AccessListTab({ slug }: AccessListTabProps) {
  const [entries, setEntries]     = useState<AccessEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Add form state
  const [valueInput, setValueInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [ruleType, setRuleType]     = useState<RuleType>("value");
  const [adding, setAdding]         = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/workflows/${slug}/access-list`);
    if (res.ok) {
      const { entries: e } = await res.json() as { entries: AccessEntry[] };
      setEntries(e);
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.value.toLowerCase().includes(q) ||
        e.label.toLowerCase().includes(q) ||
        e.rule_type.includes(q)
    );
  }, [entries, search]);

  // Group filtered entries by rule_type for display
  const grouped = useMemo(() => {
    const order: RuleType[] = ["ip", "cidr", "header", "value"];
    const map = new Map<RuleType, AccessEntry[]>();
    for (const type of order) map.set(type, []);
    for (const entry of filtered) {
      const bucket = map.get(entry.rule_type) ?? map.get("value")!;
      bucket.push(entry);
    }
    return order.map((type) => ({ type, items: map.get(type)! })).filter((g) => g.items.length > 0);
  }, [filtered]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = valueInput.trim();
    if (!value) return;
    setAdding(true);
    const res = await fetch(`/api/workflows/${slug}/access-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, label: labelInput.trim(), rule_type: ruleType }),
    });
    if (res.ok) {
      toast.success(`"${value}" added`);
      setValueInput("");
      setLabelInput("");
      await load();
    } else {
      const data = await res.json() as { error?: string };
      toast.error(data.error ?? "Failed to add entry");
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

  const currentMeta = RULE_TYPE_META[ruleType];

  return (
    <div className="space-y-6 w-full">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-600/20 flex items-center justify-center shrink-0">
          <Shield className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Access List</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Values checked at runtime by any <strong className="text-foreground">Access List</strong> node in this workflow. Matching is case-insensitive exact string comparison.
          </p>
        </div>
      </div>

      {/* Add entry form */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Entry</p>

        {/* Rule type selector */}
        <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-medium">
          {(["value", "ip", "cidr", "header"] as RuleType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRuleType(t)}
              className={`flex-1 py-2 transition-colors capitalize ${
                ruleType === t
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground -mt-2">{currentMeta.hint}</p>

        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={currentMeta.placeholder}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="text"
              placeholder="label (optional)"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              className="w-36 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !valueInput.trim()}
            className="flex items-center justify-center gap-1.5 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {adding ? "Adding…" : "Add entry"}
          </button>
        </form>
      </div>

      {/* Entries list */}
      <div className="space-y-3">
        {/* Search bar */}
        {entries.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${entries.length} entries…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <Shield className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No entries yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add an entry above to get started</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No entries match &quot;{search}&quot;</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ type, items }) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-1.5">
                  <RuleTypeBadge type={type} />
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="rounded-md border border-border divide-y divide-border">
                  {items.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="flex-1 min-w-0 text-sm font-mono text-foreground truncate">
                        {entry.value}
                      </span>
                      {entry.label && (
                        <span className="shrink-0 text-xs text-muted-foreground truncate max-w-[140px]">
                          {entry.label}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id, entry.value)}
                        disabled={deletingId === entry.id}
                        className="shrink-0 h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        title={`Remove "${entry.value}"`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} total
          {search && filtered.length !== entries.length && ` · ${filtered.length} shown`}
        </p>
      )}
    </div>
  );
}
