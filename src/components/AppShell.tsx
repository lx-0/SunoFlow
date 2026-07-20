"use client";

import { useState, useRef, useCallback } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { TIER_LABELS, TIER_BADGE_COLORS, type SubscriptionTier } from "@/lib/feature-gates";

import {
  House,
  Heart,
  Settings,
  BookOpen,
  ListMusic,
  CirclePlus,
  CircleUserRound,
  Menu,
  X,
  Clock,
  ShieldCheck,
  ChartColumn,
  Presentation,
  Lightbulb,
  Sparkles,
  Bookmark,
  UsersRound,
  Globe,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Rss,
  MessageSquareMore,
  Music,
  Layers,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "./ThemeProvider";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "./ErrorBoundary";
const GlobalPlayer = dynamic(() => import("./global-player").then((m) => m.GlobalPlayer));
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
const KeyboardShortcutsModal = dynamic(() => import("./KeyboardShortcutsModal").then((m) => m.KeyboardShortcutsModal));
import { NotificationBell } from "./NotificationBell";
import { SearchBar } from "./SearchBar";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { SunoStatusBanner } from "./SunoStatusBanner";
import { LocaleSwitcher } from "./LocaleSwitcher";
const FeedbackModal = dynamic(() => import("./FeedbackModal").then((m) => m.FeedbackModal));
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useKbFeedback } from "@/hooks/useKbFeedback";

// prefetch: true forces eager prefetch even before the link enters the viewport.
// Critical user-flow routes get this treatment so they load instantly on first click.
// hero: rendered as the filled primary CTA (Generate) instead of a ghost row.
type NavItemDef = {
  key: string;
  href: string;
  icon: LucideIcon;
  dataTour: string | undefined;
  prefetch: boolean;
  hero?: boolean;
};
// Grouped IA: 17 flat items were an undifferentiated wall with no hierarchy and
// several synonym clusters. Sections give scannable structure; the label key
// resolves to nav.section.<key> (null = ungrouped, rendered at the top).
const NAV_SECTIONS: { key: "create" | "myMusic" | "browse" | "insights" | null; items: NavItemDef[] }[] = [
  {
    key: null,
    items: [{ key: "home", href: "/", icon: House, dataTour: undefined, prefetch: false }],
  },
  {
    key: "create",
    items: [
      { key: "generate", href: "/generate", icon: CirclePlus, dataTour: "nav-generate", prefetch: true, hero: true },
      { key: "inspire", href: "/inspire", icon: Lightbulb, dataTour: "nav-inspire", prefetch: false },
      { key: "templates", href: "/templates", icon: Bookmark, dataTour: undefined, prefetch: false },
      { key: "personas", href: "/personas", icon: UsersRound, dataTour: undefined, prefetch: false },
      { key: "mashup", href: "/mashup", icon: Sparkles, dataTour: undefined, prefetch: false },
    ],
  },
  {
    key: "myMusic",
    items: [
      { key: "library", href: "/library", icon: BookOpen, dataTour: undefined, prefetch: true },
      { key: "playlists", href: "/playlists", icon: ListMusic, dataTour: "explore", prefetch: false },
      { key: "favorites", href: "/favorites", icon: Heart, dataTour: "nav-favorites", prefetch: false },
      { key: "history", href: "/history", icon: Clock, dataTour: undefined, prefetch: false },
      { key: "generations", href: "/generations", icon: Layers, dataTour: undefined, prefetch: false },
    ],
  },
  {
    key: "browse",
    items: [
      { key: "feed", href: "/feed", icon: Rss, dataTour: undefined, prefetch: false },
      { key: "radio", href: "/radio", icon: Music, dataTour: undefined, prefetch: false },
      { key: "explore", href: "/explore", icon: LayoutGrid, dataTour: undefined, prefetch: false },
      { key: "discover", href: "/discover", icon: Globe, dataTour: undefined, prefetch: false },
    ],
  },
  {
    key: "insights",
    items: [
      { key: "analytics", href: "/analytics", icon: ChartColumn, dataTour: undefined, prefetch: false },
      { key: "stats", href: "/stats", icon: Presentation, dataTour: undefined, prefetch: false },
    ],
  },
];

/** Bottom-nav hrefs: the 3 PRODUCT.md modes — Browse (library), Generate, Edit (mashup). */
const MOBILE_NAV_HREFS = ["/library", "/generate", "/mashup"];

const themeOrder = ["light", "dark", "system"] as const;
type ThemeOption = (typeof themeOrder)[number];

const themeIcons: Record<ThemeOption, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const navSections = NAV_SECTIONS.map((section) => ({
    key: section.key,
    sectionLabel: section.key ? t(`section.${section.key}`) : null,
    items: section.items.map((item) => ({ ...item, label: t(item.key) })),
  }));
  // Flat list retained for the mobile bottom bar filter (MOBILE_NAV_HREFS).
  const navItems = navSections.flatMap((section) => section.items);

  const themeLabels: Record<ThemeOption, string> = {
    light: tCommon("theme.light"),
    dark: tCommon("theme.dark"),
    system: tCommon("theme.system"),
  };

  const cycleTheme = useCallback(() => {
    const idx = themeOrder.indexOf(theme as ThemeOption);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setTheme(next);
  }, [theme, setTheme]);

  const ThemeIcon = themeIcons[(theme as ThemeOption) ?? "system"];
  const {
    sidebarOpen,
    sidebarCollapsed,
    openSidebar,
    closeSidebar,
    toggleSidebarCollapsed,
  } = useSidebarState();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { kbFeedback, showKbFeedback } = useKbFeedback();
  const drawerRef = useRef<HTMLElement>(null);

  useFocusTrap(drawerRef, sidebarOpen);
  useSwipeToDismiss(drawerRef, sidebarOpen, closeSidebar);
  useKeyboardShortcuts(useCallback(() => setShortcutsOpen(true), []), showKbFeedback);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Invisible prefetch hints for high-conversion routes not in the primary nav */}
      <Link href="/pricing" prefetch={true} className="sr-only" tabIndex={-1} aria-hidden="true">{""}</Link>
      {/* Skip-to-content link */}
      <a href="#main-content" className="skip-to-content">
        {t("skipToMain")}
      </a>
      {/* ── Desktop sidebar (md+) ── */}
      <aside aria-label="Main navigation" className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-surface-deep border-r border-border z-20 transition-all duration-200 ${sidebarCollapsed ? "md:w-16" : "md:w-56"}`}>
        {/* Logo + collapse toggle */}
        <div className={`flex items-center h-14 border-b border-border ${sidebarCollapsed ? "justify-center px-2" : "px-4 justify-between"}`}>
          {!sidebarCollapsed && (
            <span className="text-violet-400 font-bold text-lg tracking-tight">SunoFlow</span>
          )}
          <button
            onClick={toggleSidebarCollapsed}
            aria-label={t("toggleSidebar")}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors"
          >
            {sidebarCollapsed ? <Icon icon={ChevronRight} className="w-4 h-4" /> : <Icon icon={ChevronLeft} className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav links — grouped into labeled sections */}
        <nav aria-label="Primary" className="flex-1 min-h-0 overflow-y-auto py-3 px-2 space-y-1">
          {navSections.map((section, sectionIdx) => (
            <div key={section.key ?? "top"} className="space-y-1" role="group" aria-label={section.sectionLabel ?? undefined}>
              {!sidebarCollapsed && section.sectionLabel && (
                <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted select-none">
                  {section.sectionLabel}
                </div>
              )}
              {sidebarCollapsed && section.key && sectionIdx > 0 && (
                <div className="mx-2 my-2 border-t border-border" aria-hidden="true" />
              )}
              {section.items.map(({ label, href, icon: ItemIcon, dataTour, prefetch, hero }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={prefetch}
                    aria-current={active ? "page" : undefined}
                    aria-label={label}
                    title={sidebarCollapsed ? label : undefined}
                    {...(dataTour ? { "data-tour": dataTour } : {})}
                    className={`flex items-center rounded-lg text-sm transition-colors min-h-[44px] ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${
                      hero
                        ? "font-semibold bg-violet-600 text-white hover:bg-violet-500 shadow-sm"
                        : active
                          ? "font-medium bg-surface-raised text-accent"
                          : "font-medium text-secondary hover:bg-surface-hover hover:text-primary"
                    }`}
                  >
                    <Icon icon={ItemIcon} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {!sidebarCollapsed && label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section — profile/settings/signout */}
        {session?.user && (
          <div className="border-t border-border p-2 space-y-1">
            {/* Tier badge — visible when sidebar is expanded and user is on paid tier */}
            {!sidebarCollapsed && (() => {
              const tier: SubscriptionTier = session.user.subscriptionTier ?? "free";
              if (tier === "free") return null;
              return (
                <Link
                  href="/settings/billing"
                  aria-label="billing plan"
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <span className="text-xs text-secondary">Plan</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${TIER_BADGE_COLORS[tier]}`}>
                    {TIER_LABELS[tier]}
                  </span>
                </Link>
              );
            })()}
            {!!session.user.isAdmin && (
              <Link
                href="/admin"
                aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                aria-label={t("admin")}
                title={sidebarCollapsed ? "Admin" : undefined}
                className={`flex items-center rounded-lg text-sm font-medium transition-colors min-h-[44px] ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${
                  pathname.startsWith("/admin")
                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    : "text-secondary hover:bg-surface-hover hover:text-primary"
                }`}
              >
                <Icon icon={ShieldCheck} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!sidebarCollapsed && t("admin")}
              </Link>
            )}
            <Link
              href="/profile"
              aria-current={pathname === "/profile" ? "page" : undefined}
              aria-label={tCommon("profile")}
              title={sidebarCollapsed ? tCommon("profile") : undefined}
              className={`flex items-center rounded-lg text-sm font-medium transition-colors min-h-[44px] ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${
                pathname === "/profile"
                  ? "bg-surface-raised text-accent"
                  : "text-secondary hover:bg-surface-hover hover:text-primary"
              }`}
            >
              <Icon icon={CircleUserRound} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {!sidebarCollapsed && tCommon("profile")}
            </Link>
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              aria-label={t("settings")}
              title={sidebarCollapsed ? t("settings") : undefined}
              className={`flex items-center rounded-lg text-sm font-medium transition-colors min-h-[44px] ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${
                pathname === "/settings"
                  ? "bg-surface-raised text-accent"
                  : "text-secondary hover:bg-surface-hover hover:text-primary"
              }`}
            >
              <Icon icon={Settings} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {!sidebarCollapsed && t("settings")}
            </Link>
            <div className={sidebarCollapsed ? "flex justify-center py-1" : "px-2 py-1"}>
              <LocaleSwitcher iconOnly={sidebarCollapsed} />
            </div>
            <button
              onClick={() => setFeedbackOpen(true)}
              aria-label="Send feedback"
              title={sidebarCollapsed ? "Send feedback" : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors min-h-[44px] ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}
            >
              <Icon icon={MessageSquareMore} className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {!sidebarCollapsed && "Feedback"}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label={tCommon("logout")}
              title={sidebarCollapsed ? tCommon("logout") : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors min-h-[44px] ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}
            >
              {sidebarCollapsed ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              ) : tCommon("logout")}
            </button>
          </div>
        )}
      </aside>

      {/* ── Mobile sidebar drawer overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-surface-deep border-r border-border transform transition-transform duration-200 ease-in-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b border-border">
          <span className="text-violet-400 font-bold text-lg tracking-tight">SunoFlow</span>
          <button
            onClick={closeSidebar}
            aria-label={t("closeMenu")}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors"
          >
            <Icon icon={X} className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable area: nav links + bottom section */}
        <div className="flex-1 overflow-y-auto">
        {/* Nav links — grouped into labeled sections */}
        <nav aria-label="Primary" className="py-3 px-2 space-y-1">
          {navSections.map((section) => (
            <div key={section.key ?? "top"} className="space-y-1" role="group" aria-label={section.sectionLabel ?? undefined}>
              {section.sectionLabel && (
                <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted select-none">
                  {section.sectionLabel}
                </div>
              )}
              {section.items.map(({ label, href, icon: ItemIcon, hero }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                      hero
                        ? "font-semibold bg-violet-600 text-white hover:bg-violet-500 shadow-sm"
                        : active
                          ? "font-medium bg-surface-raised text-accent"
                          : "font-medium text-secondary hover:bg-surface-hover hover:text-primary"
                    }`}
                  >
                    <Icon icon={ItemIcon} className="w-5 h-5" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        {session?.user && (
          <div className="border-t border-border p-2 space-y-1">
            {/* Tier badge for mobile drawer */}
            {(() => {
              const tier: SubscriptionTier = session.user.subscriptionTier ?? "free";
              if (tier === "free") return null;
              return (
                <Link
                  aria-label="billing plan"
                  href="/settings/billing"
                  onClick={closeSidebar}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <span className="text-xs text-secondary">Plan</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${TIER_BADGE_COLORS[tier]}`}>
                    {TIER_LABELS[tier]}
                  </span>
                </Link>
              );
            })()}
              <Link
                href="/profile"
                onClick={closeSidebar}
                aria-current={pathname === "/profile" ? "page" : undefined}
                aria-label={tCommon("profile")}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                pathname === "/profile"
                  ? "bg-surface-raised text-accent"
                  : "text-secondary hover:bg-surface-hover hover:text-primary"
              }`}
            >
              <Icon icon={CircleUserRound} className="w-5 h-5" aria-hidden="true" />
              {tCommon("profile")}
            </Link>
            <Link
              href="/settings"
              onClick={closeSidebar}
              aria-current={pathname === "/settings" ? "page" : undefined}
              aria-label={t("settings")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                pathname === "/settings"
                  ? "bg-surface-raised text-accent"
                  : "text-secondary hover:bg-surface-hover hover:text-primary"
              }`}
            >
              <Icon icon={Settings} className="w-5 h-5" aria-hidden="true" />
              {t("settings")}
            </Link>
            <div className="px-2 py-1">
              <LocaleSwitcher compact />
            </div>
            <button
              onClick={() => { closeSidebar(); setFeedbackOpen(true); }}
              aria-label="Send feedback"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors min-h-[44px]"
            >
              <Icon icon={MessageSquareMore} className="w-5 h-5" aria-hidden="true" />
              Feedback
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label={tCommon("logout")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors min-h-[44px]"
            >
              {tCommon("logout")}
            </button>
          </div>
        )}
        </div>{/* end scrollable area */}
      </aside>

      {/* ── Main content area ── */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${sidebarCollapsed ? "md:ml-16" : "md:ml-56"}`}>
        {/* Top header */}
        <header className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
          {/* Hamburger (mobile only) */}
          <button
            onClick={openSidebar}
            aria-label={t("openMenu")}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors md:hidden"
          >
            <Icon icon={Menu} className="w-6 h-6" />
          </button>

          <span className="text-violet-400 font-bold text-lg tracking-tight md:hidden">SunoFlow</span>

          {/* Search bar (visible when authenticated) */}
          {session?.user && (
            <div className="flex-1 max-w-md mx-2 sm:mx-4">
              <SearchBar />
            </div>
          )}

          {session?.user && (
            <div className="flex items-center gap-3">
              {/* Subscription status — desktop */}
              <div className="hidden md:flex">
                <SubscriptionStatusBadge />
              </div>
              {/* Subscription status — mobile (compact) */}
              <div className="flex md:hidden">
                <SubscriptionStatusBadge compact />
              </div>
              <button
                onClick={cycleTheme}
                aria-label={themeLabels[(theme as ThemeOption) ?? "system"]}
                title={themeLabels[(theme as ThemeOption) ?? "system"]}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
              >
                <Icon icon={ThemeIcon} className="w-5 h-5" aria-hidden="true" />
              </button>
              <NotificationBell />
              <Link
                href="/profile"
                aria-label={tCommon("profile")}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors md:hidden ${
                  pathname === "/profile" ? "text-violet-400" : "text-secondary hover:text-primary"
                }`}
              >
                <Icon icon={CircleUserRound} className="w-5 h-5" />
              </Link>
              <Link
                href="/settings"
                aria-label={t("settings")}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors md:hidden ${
                  pathname === "/settings" ? "text-violet-400" : "text-secondary hover:text-primary"
                }`}
              >
                <Icon icon={Settings} className="w-5 h-5" />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label={tCommon("logout")}
                className="text-sm text-secondary hover:text-primary transition-colors min-h-[44px] px-2 hidden md:block"
              >
                {tCommon("logout")}
              </button>
            </div>
          )}
        </header>

        {/* Email verification banner */}
        <EmailVerificationBanner />

        {/* Suno API degradation banner */}
        <SunoStatusBanner />

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto pb-36 md:pb-24">
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>

        {/* Global audio player */}
        <ErrorBoundary source="global-player" fallback={null}>
          <GlobalPlayer sidebarCollapsed={sidebarCollapsed} />
        </ErrorBoundary>

        {/* Keyboard shortcuts help modal */}
        <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        {/* Feedback modal */}
        {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}

        {/* Keyboard action feedback overlay */}
        {kbFeedback && (
          <div
            aria-live="polite"
            aria-atomic="true"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none"
          >
            <div className="bg-black/75 text-white text-sm font-medium px-4 py-2 rounded-full whitespace-nowrap">
              {kbFeedback}
            </div>
          </div>
        )}

        {/* Bottom nav (mobile only) */}
        <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-10 bg-surface border-t border-border md:hidden">
          <div className="flex items-center justify-around h-16">
            {navItems.filter(({ href }) => MOBILE_NAV_HREFS.includes(href)).map(({ label, href, icon: ItemIcon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] ${
                    active
                      ? "text-violet-400"
                      : "text-muted hover:text-secondary"
                  }`}
                >
                  <Icon icon={ItemIcon} className="w-6 h-6" aria-hidden="true" />
                  <span className="text-[10px]" aria-hidden="true">{label}</span>
                </Link>
              );
            })}
            <button
              onClick={openSidebar}
              aria-label={t("openMenu")}
              className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] text-muted hover:text-secondary"
            >
              <Icon icon={Menu} className="w-6 h-6" aria-hidden="true" />
              <span className="text-[10px]" aria-hidden="true">More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
