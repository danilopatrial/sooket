"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariablesContext } from "@/lib/variables-context";
import { GeneralTab } from "./GeneralTab";
import { AccessListTab } from "./AccessListTab";
import { VariablesTab } from "./VariablesTab";
import { ProviderKeysTab } from "./ProviderKeysTab";
import { ApiKeysTab } from "./ApiKeysTab";
import { ExecutionsTab } from "./ExecutionsTab";
import { CredentialsTab } from "./CredentialsTab";

const TABS = [
  { id: "general",      label: "General" },
  { id: "api-keys",     label: "API Keys" },
  { id: "access-list",  label: "Access List" },
  { id: "variables",    label: "Variables" },
  { id: "provider-keys", label: "Provider Keys" },
  { id: "executions",    label: "Executions" },
  { id: "credentials",   label: "Credentials" },
] as const;

type TabId = typeof TABS[number]["id"];

interface ConfigShellProps {
  slug: string;
  name: string;
  isActive: boolean;
  hasAnthropicKey: boolean;
  initialTab: string;
}

export function ConfigShell({
  slug,
  name,
  isActive,
  hasAnthropicKey,
  initialTab,
}: ConfigShellProps) {
  const router = useRouter();
  const validTab = TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : "general";
  const [activeTab, setActiveTab] = useState<TabId>(validTab);

  function switchTab(id: TabId) {
    setActiveTab(id);
    router.replace(`/workflow/${slug}/config?tab=${id}`, { scroll: false });
  }

  // Variables context state — shared with VariablesTab
  const [varNames, setVarNames] = useState<string[]>([]);

  function refreshVars() {
    fetch(`/api/workflows/${slug}/variables`)
      .then((r) => r.json())
      .then((rows: Array<{ name: string }>) => setVarNames(rows.map((r) => r.name)))
      .catch(() => {});
  }

  useEffect(() => { refreshVars(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <VariablesContext.Provider value={{ names: varNames, refresh: refreshVars }}>
      <div className="min-h-full flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-4">
            {/* Top bar */}
            <div className="flex items-center gap-3 py-4">
              <Link
                href={`/workflow/${slug}`}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Canvas
              </Link>
              <div className="h-4 w-px bg-border" />
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground truncate">{name}</span>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 mx-auto max-w-2xl w-full px-4 py-8">
          {activeTab === "general" && (
            <GeneralTab slug={slug} name={name} isActive={isActive} />
          )}
          {activeTab === "api-keys" && (
            <ApiKeysTab slug={slug} />
          )}
          {activeTab === "access-list" && (
            <AccessListTab slug={slug} />
          )}
          {activeTab === "variables" && (
            <VariablesTab slug={slug} />
          )}
          {activeTab === "provider-keys" && (
            <ProviderKeysTab slug={slug} hasAnthropicKey={hasAnthropicKey} />
          )}
          {activeTab === "executions" && (
            <ExecutionsTab slug={slug} />
          )}
          {activeTab === "credentials" && (
            <CredentialsTab slug={slug} />
          )}
        </div>
      </div>
    </VariablesContext.Provider>
  );
}
