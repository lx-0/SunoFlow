import { router, type Href } from "expo-router";

// Centralized navigation semantics for SunoFlow mobile. There are exactly three
// navigation intents — keep every call site mapped to one of them:
//
//   1. switchTo(route)  — change the top-level SECTION (bottom nav, sidebar,
//      "go to X" shortcuts). Collapses the current stack back to the home base
//      first, so sections never stack on top of each other and Back from any
//      section returns to the home tab — not to the previously visited section.
//
//   2. openPlayer()     — the single Now-Playing modal. Uses navigate(), which
//      pops to an existing /player instance instead of pushing a duplicate, so
//      the player can never be opened twice.
//
//   3. drill-down       — opening a song / playlist / detail FROM a list. These
//      keep using router.push(...) directly at the call site: they are
//      contextual children where Back should return to the originating list.
//
// See apps/mobile/NAVIGATION.md for the full UX model and rationale.

/**
 * Open the full Now-Playing screen as a single modal.
 *
 * navigate() (not push()) is deliberate: if a /player screen already exists
 * anywhere in the history it pops to it rather than stacking a second modal —
 * fixing the "two players, must close both" bug.
 */
export function openPlayer() {
  router.navigate("/player");
}

/**
 * Switch the top-level section.
 *
 * Dismisses any drill-down / open modal back to the home base (popToTop of the
 * closest stack) and then navigates, keeping the back stack shallow and Back
 * predictable. No-op when already on the target route.
 *
 * @param route       destination top-level route
 * @param currentPath result of usePathname() from the calling component
 */
export function switchTo(route: Href, currentPath: string) {
  if (route === currentPath) return;
  if (router.canDismiss()) {
    try {
      router.dismissAll();
    } catch (e) {
      console.warn("[nav] dismissAll failed", e);
    }
  }
  router.navigate(route);
}
