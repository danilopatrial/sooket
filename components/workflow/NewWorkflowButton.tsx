"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewWorkflowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/workflows", { method: "POST" });
    if (!res.ok) {
      toast.error("Failed to create workflow");
      setLoading(false);
      return;
    }
    const { slug } = await res.json();
    router.push(`/workflow/${slug}`);
  }

  return (
    <Button onClick={handleCreate} disabled={loading}>
      <Plus className="h-4 w-4 mr-2" />
      {loading ? "Creating…" : "New Workflow"}
    </Button>
  );
}
