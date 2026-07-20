"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * Groups sibling routes that used to be separate top-level nav items into one
 * destination with a tab bar (Phase-2 nav consolidation). Each tab links a real
 * existing route — nothing is merged or lost, the nav just stops advertising the
 * near-duplicates as co-equal destinations. Active tab is derived from the
 * locale-stripped pathname.
 */
const GROUPS = {
  myMusic: [
    { href: "/library", key: "songs" },
    { href: "/history", key: "recentlyPlayed" },
    { href: "/generations", key: "generationHistory" },
  ],
  insights: [
    { href: "/insights", key: "overview" },
    { href: "/analytics", key: "production" },
    { href: "/stats", key: "listening" },
  ],
} as const;

export function SectionTabs({ group }: { group: keyof typeof GROUPS }) {
  const pathname = usePathname();
  const t = useTranslations("nav.tab");
  const tabs = GROUPS[group];

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border" role="tablist">
        {tabs.map(({ href, key }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors min-h-[44px] flex items-center ${
                active
                  ? "border-violet-500 text-primary"
                  : "border-transparent text-secondary hover:text-primary hover:border-border"
              }`}
            >
              {t(key)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
