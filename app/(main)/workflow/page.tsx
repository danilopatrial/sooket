import { getDb } from "@/lib/db";
import { Separator } from "@/components/ui/separator";
import { NewWorkflowButton } from "@/components/workflow/NewWorkflowButton";
import { WorkflowList } from "@/components/workflow/WorkflowList";

interface WorkflowRow {
  id: number;
  name: string;
  slug: string;
  is_active: number;
  created_at: string;
}

export default function WorkflowsPage() {
  const db = getDb();
  const workflows = (db.prepare(
    `SELECT id, name, slug, is_active, created_at FROM workflows ORDER BY created_at DESC`
  ).all() as unknown as WorkflowRow[]).map((r) => ({ ...r }));

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">Your API middleware pipelines</p>
        </div>
        <NewWorkflowButton />
      </div>

      <Separator />

      <WorkflowList workflows={workflows} />
    </div>
  );
}
