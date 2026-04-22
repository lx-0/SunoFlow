import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportView } from "@/components/ImportView";
import { Skeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Import from Suno",
  description: "Browse and import songs from your Suno account into your SunoFlow library.",
  robots: { index: false },
};

function ImportSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="space-y-2 mb-6">
        <Skeleton className="h-8 w-56 rounded" />
        <Skeleton className="h-4 w-40 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <AppShell>
      <Suspense fallback={<ImportSkeleton />}>
        <ImportView />
      </Suspense>
    </AppShell>
  );
}
