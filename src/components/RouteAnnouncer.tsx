"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Announces route changes to screen readers via a visually-hidden aria-live region.
 * Next.js App Router does not include a built-in route announcer (unlike Pages Router),
 * so this component fills that gap for WCAG 2.1 AA compliance (SC 4.1.3).
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const announcerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial mount — no navigation has occurred yet
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const el = announcerRef.current;
    if (!el) return;

    // Derive a human-readable page name from the pathname.
    // Strip locale prefix (e.g. /en, /de, /ja), leading slash, and
    // turn path segments into title-cased words.
    const segments = pathname
      .replace(/^\/(en|de|ja)/, "")
      .replace(/^\//, "")
      .split("/")
      .filter(Boolean);

    const pageName =
      segments.length === 0
        ? "Home"
        : segments
            .map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
            .join(" — ");

    // Temporarily clear then set so the browser fires the live region event
    // even when navigating between routes with the same derived name.
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = `Navigated to ${pageName}`;
    });
  }, [pathname]);

  return (
    <div
      ref={announcerRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
