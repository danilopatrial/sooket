import { getDb } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { GenerateApiKey } from "@/components/account/GenerateApiKey";
import { ApiKeyDisplay } from "@/components/account/ApiKeyDisplay";
import { ProviderKeyForm } from "@/components/account/ProviderKeyForm";

export default function AccountPage() {
  const db = getDb();

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM workflows`).get() as unknown as { count: number };
  const apiKeyRow = db.prepare(`SELECT value FROM settings WHERE key = 'api_key'`).get() as unknown as { value: string } | undefined;
  const hasAnthropicKey = !!db.prepare(`SELECT id FROM provider_keys WHERE provider = ?`).get("anthropic");

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Local instance</p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instance</CardTitle>
          <CardDescription>Running locally — no authentication required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Mode</span>
            <Badge variant="secondary">Local</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Workflows</span>
            <Badge variant="secondary">{countRow.count}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Management API Key</CardTitle>
          <CardDescription>
            Used to authenticate the <code className="text-xs">/api/admin/backup</code> route.
            Keep this secret — it grants read access to the entire database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeyRow?.value ? (
            <ApiKeyDisplay apiKey={apiKeyRow.value} />
          ) : (
            <GenerateApiKey />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global Provider Keys</CardTitle>
          <CardDescription>
            Instance-level provider keys stored here and accessible via{" "}
            <code className="text-xs">/api/provider-keys</code>. Per-workflow
            keys are configured separately in the workflow&apos;s{" "}
            <strong>Config</strong> tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderKeyForm
            provider="anthropic"
            label="Anthropic API Key"
            hasExistingKey={hasAnthropicKey}
          />
        </CardContent>
      </Card>
    </div>
  );
}
