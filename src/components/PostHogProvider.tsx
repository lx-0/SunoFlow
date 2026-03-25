"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initAnalytics, pageView } from "@/lib/analytics";

/**
 * Initializes PostHog and tracks page views on route changes.
 * Must be rendered inside a Suspense boundary (required for useSearchParams).
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize once on mount
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      initAnalytics();
      initRef.current = true;
    }
  }, []);

  // Track page views on navigation
  useEffect(() => {
    const url = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    pageView(url);
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogPageViewWrapper />
      {children}
    </>
  );
}

// Wrap in Suspense for useSearchParams (Next.js App Router requirement)
import { Suspense } from "react";
function PostHogPageViewWrapper() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
