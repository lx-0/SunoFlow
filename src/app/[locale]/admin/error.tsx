"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { logError } from "@/lib/error-logger";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("error-boundary:admin", error);
  }, [error]);
  return (
    <div className="px-4 py-12 flex flex-col items-center text-center space-y-4">
      <Icon icon={TriangleAlert} className="w-10 h-10 text-red-400" />
      <h2 className="text-lg font-bold">Failed to load admin panel</h2>
      <p className="text-secondary text-sm">
        Something went wrong loading the admin panel. Please try again.
      </p>
      <div className="flex gap-2">
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
  );
}
