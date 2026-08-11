import { useWindowDimensions } from "react-native";

// Responsive layout tokens. The app ships for iPhone AND iPad (app.json
// ios.supportsTablet), so every screen has to survive canvases from a 375pt
// iPhone SE up to a 1366pt iPad Pro in landscape — plus iPad multitasking, where
// the window is resized live and can be narrower than a phone.
//
// Width classes follow Apple's compact/regular idea but split "regular" in two,
// because a 1024pt landscape iPad carries a permanent sidebar plus a wide content
// column while a 744pt portrait iPad mini does not.
//
//   compact   < 700   iPhone in any orientation, iPad Slide Over / narrow split
//   medium    700+    iPad portrait, half-screen split view
//   expanded  1024+   iPad landscape, full-screen 11"/13"
//
// Drive layout off these, never off Platform.isPad: multitasking means an iPad
// can be phone-narrow, and a phone in landscape can be wider than it is tall.

export const BREAKPOINTS = { medium: 700, expanded: 1024 } as const;

export type WidthClass = "compact" | "medium" | "expanded";

/** Max width of a centered content column, by kind of content. */
export const CONTENT_MAX = {
  /** Prose, forms, settings — long lines hurt readability past ~75 characters. */
  text: 720,
  /** Grids and dashboards, which use the space instead of stretching one column. */
  wide: 1180,
} as const;

/** Permanent navigation rail width on medium/expanded. Matches the drawer's 280. */
export const SIDEBAR_WIDTH = 280;

export interface Layout {
  width: number;
  height: number;
  widthClass: WidthClass;
  /** medium or expanded — i.e. the permanent sidebar is showing. */
  isWide: boolean;
  isLandscape: boolean;
  /** Horizontal screen padding that grows with the canvas. */
  gutter: number;
  /**
   * Column count for a grid of items that should stay at least `minItemWidth`
   * wide. Never returns less than 1.
   */
  columns: (minItemWidth: number) => number;
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();

  const widthClass: WidthClass =
    width >= BREAKPOINTS.expanded ? "expanded" : width >= BREAKPOINTS.medium ? "medium" : "compact";
  const isWide = widthClass !== "compact";

  return {
    width,
    height,
    widthClass,
    isWide,
    isLandscape: width > height,
    gutter: widthClass === "expanded" ? 32 : widthClass === "medium" ? 24 : 16,
    columns: (minItemWidth: number) => {
      // The content column, not the window: on wide the sidebar eats 280pt.
      const available = (isWide ? width - SIDEBAR_WIDTH : width) - 2 * (isWide ? 24 : 16);
      return Math.max(1, Math.floor(available / minItemWidth));
    },
  };
}
