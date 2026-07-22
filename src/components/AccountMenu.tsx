"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  ChevronsUpDown,
  CircleUserRound,
  LogOut,
  MessageSquareMore,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { TIER_LABELS, TIER_BADGE_COLORS, type SubscriptionTier } from "@/lib/feature-gates";

interface AccountMenuProps {
  /** Icon-only trigger for the collapsed desktop sidebar. */
  collapsed?: boolean;
  onFeedback: () => void;
  /** Called after a menu action so the mobile drawer can close itself. */
  onNavigate?: () => void;
}

/**
 * Single account entry replacing the former six-item sidebar bottom block
 * (Plan / Admin / Profile / Settings / language / Feedback / Sign out).
 * The language switcher moved to Settings → Preferences.
 */
export function AccountMenu({ collapsed = false, onFeedback, onNavigate }: AccountMenuProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOutsideClick(rootRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!session?.user) return null;

  const tier: SubscriptionTier = session.user.subscriptionTier ?? "free";
  const displayName = session.user.name ?? session.user.email ?? tCommon("account");

  function closeMenu() {
    setOpen(false);
  }

  function handleNavigate() {
    closeMenu();
    onNavigate?.();
  }

  const itemClass =
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors min-h-[44px]";

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <div
          role="menu"
          aria-label={tCommon("accountMenu")}
          className="absolute bottom-full left-0 mb-1 w-56 max-w-[calc(100vw-1rem)] bg-surface-raised border border-border rounded-xl shadow-2xl py-1 z-40"
        >
          {tier !== "free" && (
            <>
              <Link
                role="menuitem"
                href="/settings/billing"
                aria-label="billing plan"
                onClick={handleNavigate}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <span className="text-xs text-secondary">Plan</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${TIER_BADGE_COLORS[tier]}`}>
                  {TIER_LABELS[tier]}
                </span>
              </Link>
              <div className="border-t border-border my-1" aria-hidden="true" />
            </>
          )}
          <Link
            role="menuitem"
            href="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            onClick={handleNavigate}
            className={itemClass}
          >
            <Icon icon={CircleUserRound} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            {tCommon("profile")}
          </Link>
          <Link
            role="menuitem"
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
            onClick={handleNavigate}
            className={itemClass}
          >
            <Icon icon={Settings} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            {t("settings")}
          </Link>
          {!!session.user.isAdmin && (
            <Link
              role="menuitem"
              href="/admin"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              onClick={handleNavigate}
              className={itemClass}
            >
              <Icon icon={ShieldCheck} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {t("admin")}
            </Link>
          )}
          <div className="border-t border-border my-1" aria-hidden="true" />
          <button
            role="menuitem"
            onClick={() => {
              handleNavigate();
              onFeedback();
            }}
            className={itemClass}
          >
            <Icon icon={MessageSquareMore} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            Feedback
          </button>
          <button
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={itemClass}
          >
            <Icon icon={LogOut} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            {tCommon("logout")}
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={tCommon("accountMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? displayName : undefined}
        className={`w-full flex items-center rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
        } ${open ? "bg-surface-raised text-primary" : "text-secondary hover:bg-surface-hover hover:text-primary"}`}
      >
        <Icon icon={CircleUserRound} className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
        {!collapsed && (
          <>
            <span className="flex-1 min-w-0 text-left truncate">{displayName}</span>
            {tier !== "free" && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${TIER_BADGE_COLORS[tier]}`}>
                {TIER_LABELS[tier]}
              </span>
            )}
            <Icon icon={ChevronsUpDown} className="w-4 h-4 flex-shrink-0 text-muted" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}
