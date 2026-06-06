import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import type { Node } from "@xyflow/react";
import type { ConnectionType, EvalResult } from "@/lib/workflow-types";
import type { Edge } from "@xyflow/react";

type CanvasEdge = Edge & { connectionType?: ConnectionType };

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface WorkflowRow {
  id: number;
  name: string;
  nodes: string;
  edges: string;
  is_active: number;
  pin_data: string | null;
}

export default async function WorkflowCanvasPage({ params }: PageProps) {
  const { slug } = await params;
  const db = getDb();

  const workflow = db.prepare(
    `SELECT id, name, nodes, edges, is_active, pin_data FROM workflows WHERE slug = ?`
  ).get(slug) as unknown as WorkflowRow | undefined;

  if (!workflow) notFound();

  const initialPinData: Record<string, EvalResult> | undefined =
    workflow.pin_data ? (JSON.parse(workflow.pin_data) as Record<string, EvalResult>) : undefined;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <WorkflowCanvas
        slug={slug}
        initialName={workflow.name}
        initialNodes={(JSON.parse(workflow.nodes) as Node[]) ?? []}
        initialEdges={(JSON.parse(workflow.edges) as CanvasEdge[]) ?? []}
        initialActive={!!workflow.is_active}
        initialPinData={initialPinData}
      />
    </div>
  );
}
