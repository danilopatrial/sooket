"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKeyDisplayProps {
  apiKey: string;
}

export function ApiKeyDisplay({ apiKey }: ApiKeyDisplayProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  const display = visible ? apiKey : `sk-mw-${"•".repeat(24)}`;

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={display}
        className="font-mono text-sm"
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide key" : "Show key"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleCopy}
        aria-label="Copy key"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
