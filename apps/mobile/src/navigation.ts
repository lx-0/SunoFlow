import { router, type Href } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";

// Centralized navigation semantics for SunoFlow mobile. The app is a Tabs
// navigator (Library / Playlists / Favorites / History / Profile) where every
// section and detail screen lives in a shared route group, so it is pushed
// onto the CURRENT tab's stack. There are four navigation intents — keep every
// call site mapped to one of them:
//
//   1. switchTo(route)       — jump to a top-level tab (bottom bar, sidebar).
//      Real tab switch: instant, keeps each tab's stack and scroll position.
//
//   2. goToSection(href)     — in-view jump to a section ("Use in Generate",
//      "Manage RSS feeds"). Pushes onto the current tab's stack, so Back
//      returns to where the user actually was. Tab-root hrefs ("/",
//      "/playlists", …) are detected and become real tab switches.
//
//   3. drill-down            — opening a song / playlist / detail FROM a list.
//      Call router.push(...) directly: Back returns to the originating list.
//
//   4. openPlayer()          — the single Now-Playing modal over everything.
//      closePlayerThen(href) leaves the player toward content (song details,
//      comments, …): dismiss the modal first, then push on the active tab.
//
// WHY the Tabs navigator handle below: expo-router's linkTo API cannot express
// "switch tab without touching its stack" — navigating an anchor href from a
// drilled tab PUSHES a duplicate anchor (Stack NAVIGATE only reuses the top
// route), and cross-tab hrefs carry nested `screen` params that reset the
// target tab. The BottomTabBar therefore registers the tab navigator once, and
// tab switches dispatch a NAVIGATE-by-name at the Tabs level — exactly what
// the stock react-navigation tab bar does. Verified against the vendored
// react-navigation source in expo-router 56.
//
// See apps/mobile/NAVIGATION.md for the full UX model and rationale.

type TabNavigation = BottomTabBarProps["navigation"];
type TabChildState = { key?: string; index?: number };

let tabNavigation: TabNavigation | null = null;

/** Registered by the BottomTabBar (the Tabs navigator's tabBar). */
export function registerTabNavigation(nav: TabNavigation | null) {
  tabNavigation = nav;
}

const TAB_GROUP_BY_HREF: Partial<Record<string, string>> = {
  "/": "(library)",
  "/playlists": "(playlists)",
  "/favorites": "(favorites)",
  "/history": "(history)",
  "/profile": "(profile)",
};

// Fallback hrefs when the tab navigator is not mounted (should not happen from
// any user-reachable surface; kept so navigation can never dead-end).
const TAB_ANCHOR_HREF: Record<string, Href> = {
  "(library)": "/(tabs)/(library)",
  "(playlists)": "/(tabs)/(playlists)/playlists",
  "(favorites)": "/(tabs)/(favorites)/favorites",
  "(history)": "/(tabs)/(history)/history",
  "(profile)": "/(tabs)/(profile)/profile",
};

function tabState() {
  return tabNavigation?.getState();
}

/** Route-group name of the currently focused tab, e.g. "(history)". */
export function activeTabGroup(): string {
  const s = tabState();
  return s?.routes[s.index]?.name ?? "(library)";
}

/** True when the focused tab shows its anchor screen (stack not drilled). */
export function isAtTabRoot(): boolean {
  const s = tabState();
  if (!s) return true;
  const child = s.routes[s.index]?.state as TabChildState | undefined;
  return !child || (child.index ?? 0) === 0;
}

/**
 * Jump to a tab WITHOUT touching its stack — the native tab metaphor: the tab
 * resumes exactly where the user left it. NAVIGATE-by-name at the Tabs level
 * (the stock tab-bar action); never a path-based navigate, which would push a
 * duplicate anchor screen onto a drilled tab.
 */
export function jumpToTab(group: string) {
  const s = tabState();
  const route = s?.routes.find((r) => r.name === group);
  if (s && route && tabNavigation) {
    // NAVIGATE by NAME: the TabRouter resolves payload.name only (a key-only
    // payload is a silent no-op); no params, so the child stack is not reset.
    tabNavigation.dispatch({ type: "NAVIGATE", payload: { name: route.name, merge: true }, target: s.key });
  } else {
    router.navigate(TAB_ANCHOR_HREF[group] ?? "/");
  }
}

/**
 * Open the full Now-Playing screen as a single modal.
 *
 * navigate() (not push()) is deliberate: if the /player modal is already open
 * it is a no-op instead of stacking a second modal.
 */
export function openPlayer() {
  router.navigate("/player");
}

/**
 * Leave the player modal toward a content screen (song details, comments,
 * related, versions, extend). Dismisses the modal, then pushes the target on
 * the ACTIVE tab's stack (queue/lyrics stay sheets over the player instead).
 *
 * The href must be group-qualified here: the dismiss and the push drain in one
 * router batch, so path resolution still sees the modal's segments and a bare
 * "/song/[id]" would always resolve into the first group — the Library tab.
 */
export function closePlayerThen(href: Href) {
  const group = activeTabGroup();
  if (router.canDismiss()) {
    router.dismiss();
  }
  const qualified = typeof href === "string" ? (`/(tabs)/${group}${href}` as Href) : href;
  router.push(qualified);
}

/**
 * In-view jump to a section (e.g. "Use in Generate", "Browse library",
 * "Manage RSS feeds"). Pushes onto the current tab's stack — Back returns to
 * the screen the user came from. Params on an object Href are preserved.
 * Tab-root hrefs become real tab switches. Not for drill-downs into a song /
 * playlist / detail; those call router.push directly at the call site.
 */
export function goToSection(href: Href) {
  const group = typeof href === "string" ? TAB_GROUP_BY_HREF[href] : undefined;
  if (group) {
    jumpToTab(group);
    return;
  }
  router.navigate(href);
}

/**
 * Switch to a top-level tab from a persistent nav surface (bottom tab bar,
 * sidebar). Non-tab hrefs (sidebar sections) fall through to goToSection.
 *
 * @param route       destination route ("/", "/playlists", "/discover", …)
 * @param currentPath result of usePathname() from the calling component
 */
export function switchTo(route: Href, currentPath: string) {
  if (route === currentPath) return;
  goToSection(route);
}
