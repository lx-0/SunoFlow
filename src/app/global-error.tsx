"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logError } from "@/lib/error-logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("global-error-boundary", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-surface-deep text-primary min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="text-4xl">!</div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-secondary text-sm">
            An unexpected error occurred. Please try again.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={reset}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-surface-hover hover:bg-border text-primary text-sm font-medium rounded-lg transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
