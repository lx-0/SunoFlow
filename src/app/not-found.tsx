import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

// This component is rendered by the root layout (which intentionally omits
// <html>/<body> so that [locale]/layout.tsx can provide them for locale-aware
// routes). When a 404 occurs on a non-locale-prefixed path (e.g. English
// default) next-intl doesn't route through [locale], so this file is used
// directly. It must supply its own <html>/<body> to avoid Next.js's dev-mode
// "missing root layout tags" error overlay which covers the content.
export default function NotFound() {
  return (
    <html lang="en">
      <head />
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <div className="flex flex-col min-h-screen max-w-md mx-auto">
          <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
            <span className="text-violet-400 font-bold text-lg tracking-tight">SunoFlow</span>
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-sm space-y-4">
              <p className="text-6xl font-bold text-gray-300">404</p>
              <h1 className="text-xl font-bold">Page not found</h1>
              <p className="text-gray-500 text-sm">
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/library"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  Search Your Library
                </Link>
                <Link
                  href="/"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 text-sm font-medium rounded-lg transition-colors text-center"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
