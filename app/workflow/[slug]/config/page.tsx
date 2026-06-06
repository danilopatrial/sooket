import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { ConfigShell } from "@/components/workflow-config/ConfigShell";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

interface WorkflowRow {
  id: number;
  name: string;
  slug: string;
  is_active: number;
}

export default async function WorkflowConfigPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const db = getDb();

  const workflow = db.prepare(
    `SELECT id, name, slug, is_active FROM workflows WHERE slug = ?`
  ).get(slug) as unknown as WorkflowRow | undefined;

  if (!workflow) notFound();

  const providerKey = db.prepare(
    `SELECT id FROM workflow_provider_keys WHERE workflow_id = ? AND provider = ?`
  ).get(workflow.id, "anthropic") as unknown as { id: number } | undefined;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <ConfigShell
        slug={slug}
        name={workflow.name}
        isActive={!!workflow.is_active}
        hasAnthropicKey={!!providerKey}
        initialTab={tab ?? "general"}
      />
    </div>
  );
}
