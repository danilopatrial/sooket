"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GenerateApiKey() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const res = await fetch("/api/account/api-key", { method: "POST" });
    if (res.ok) {
      toast.success("API key generated");
      router.refresh();
    } else {
      const { error } = await res.json();
      toast.error(error ?? "Failed to generate key");
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={loading} variant="outline">
      <KeyRound className="h-4 w-4 mr-2" />
      {loading ? "Generating…" : "Generate API Key"}
    </Button>
  );
}
