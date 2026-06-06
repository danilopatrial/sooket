"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.digest
            ? `An unexpected error occurred (ref: ${error.digest}).`
            : "An unexpected error occurred. Try refreshing the page."}
        </p>
      </div>
      <Button variant="outline" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </div>
  );
}
