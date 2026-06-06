"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en" className="dark">
      <body className="bg-background text-foreground flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-500"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Application error</h2>
          <p className="text-sm text-zinc-400 max-w-sm">
            {error.digest
              ? `A critical error occurred (ref: ${error.digest}). Reload the page to try again.`
              : "A critical error occurred. Reload the page to try again."}
          </p>
        </div>
        <button
          onClick={() => unstable_retry()}
          className="px-4 py-2 text-sm border border-zinc-700 rounded-md hover:bg-zinc-800 transition-colors"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
