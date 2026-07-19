"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { Icon } from "@/components/ui/Icon";
import {
  ChartColumn,
  ChartPie,
  Users,
  ClipboardList,
  Flag,
  ShieldAlert,
  TriangleAlert,
  ArrowLeft,
  Music,
  Presentation,
  Scale,
  Server,
  Ticket,
} from "lucide-react";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: ChartColumn },
  { label: "Mirror", href: "/admin/mirror", icon: Server },
  { label: "Analytics", href: "/admin/analytics", icon: ChartPie },
  { label: "Metrics", href: "/admin/metrics", icon: Presentation },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Invite Codes", href: "/admin/invite-codes", icon: Ticket },
  { label: "Content", href: "/admin/content", icon: Music },
  { label: "Moderation", href: "/admin/moderation", icon: ShieldAlert, badge: "reports" as const },
  { label: "Reports", href: "/admin/reports", icon: Flag },
  { label: "Appeals", href: "/admin/appeals", icon: Scale, badge: "appeals" as const },
  { label: "Errors", href: "/admin/errors", icon: TriangleAlert },
  { label: "Audit Log", href: "/admin/logs", icon: ClipboardList },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingAppeals, setPendingAppeals] = useState(0);

  useEffect(() => {
    apiGet<{ pending?: number }>("/api/admin/reports/count")
      .then((data) => { if (data?.pending) setPendingReports(data.pending); })
      .catch(() => {});
    apiGet<{ total?: number }>("/api/admin/appeals?status=pending&limit=1")
      .then((data) => { if (data?.total != null) setPendingAppeals(data.total); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <a href="#admin-main-content" className="skip-to-content">Skip to content</a>
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-surface border-r border-border z-20">
        <div className="flex items-center h-14 px-4 border-b border-border">
          <span className="text-red-400 font-bold text-lg tracking-tight">Admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {adminNav.map(({ label, href, icon: NavIcon, badge }) => {
            const active = pathname === href;
            const badgeCount = badge === "reports" ? pendingReports : badge === "appeals" ? pendingAppeals : 0;
            const showBadge = badgeCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  active
                    ? "bg-red-900/30 text-red-400"
                    : "text-secondary hover:bg-surface-hover hover:text-primary"
                }`}
              >
                <Icon icon={NavIcon} className="w-5 h-5" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className="text-xs font-bold bg-red-600 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors min-h-[44px]"
          >
            <Icon icon={ArrowLeft} className="w-5 h-5" aria-hidden="true" />
            Back to App
          </Link>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 md:ml-56">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between md:hidden">
          <span className="text-red-400 font-bold text-lg">Admin</span>
          <Link href="/" className="text-sm text-secondary hover:text-primary">
            Back to App
          </Link>
        </header>

        {/* Mobile nav */}
        <nav className="flex items-center gap-1 px-4 py-2 bg-surface border-b border-border md:hidden overflow-x-auto">
          {adminNav.map(({ label, href, icon: NavIcon, badge }) => {
            const active = pathname === href;
            const badgeCount = badge === "reports" ? pendingReports : badge === "appeals" ? pendingAppeals : 0;
            const showBadge = badgeCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  active
                    ? "bg-red-900/30 text-red-400"
                    : "text-secondary hover:text-primary"
                }`}
              >
                <Icon icon={NavIcon} className="w-4 h-4" aria-hidden="true" />
                {label}
                {showBadge && (
                  <span className="text-xs font-bold bg-red-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <main id="admin-main-content" className="flex-1 overflow-y-auto p-4 md:p-6 bg-surface-deep text-primary">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
