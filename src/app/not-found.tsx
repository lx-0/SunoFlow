import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto">
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <span className="text-violet-400 font-bold text-lg tracking-tight">SunoFlow</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <p className="text-6xl font-bold text-gray-700">404</p>
          <h1 className="text-xl font-bold">Page not found</h1>
          <p className="text-gray-400 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go Home
          </Link>
        </div>
      </main>
    </div>
  );
}
