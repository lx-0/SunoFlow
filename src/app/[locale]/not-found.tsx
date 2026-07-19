import Link from "next/link";
import { Search } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto">
      <header className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3">
        <span className="text-violet-400 font-bold text-lg tracking-tight">SunoFlow</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <p className="text-6xl font-bold text-muted">404</p>
          <h1 className="text-xl font-bold">Page not found</h1>
          <p className="text-secondary text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/library"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Icon icon={Search} className="w-4 h-4" />
              Search Your Library
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-surface-hover hover:bg-border text-primary text-sm font-medium rounded-lg transition-colors text-center"
            >
              Go Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
