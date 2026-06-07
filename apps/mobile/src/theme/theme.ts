// Centralized design tokens. Screens pull colors via useTheme() — never hardcode
// hex — so dark/light AND multiple named themes work app-wide. A theme is a named
// palette family with a dark + light variant; the user picks the theme (accent
// family) and the mode (dark/light/system) independently.
//
// Values are the DESIGN.md "Late-Night Studio Console" OKLCH tokens converted to
// sRGB hex (React Native cannot parse oklch()). Every neutral carries a faint
// magenta tint (hue 350) per the Tinted-Neutrals rule — no pure #000/#fff. The
// default theme is Electric Magenta, the single brand accent.

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentStrong: string;
  onAccent: string;
  danger: string;
  dangerBg: string;
  star: string;
  // status badge pairs (generation states)
  successFg: string;
  successBg: string;
  warnFg: string;
  warnBg: string;
}

export type ColorScheme = "dark" | "light";

// Neutral bases shared by every theme; themes only override the accent pair.
// Tinted-near-black surface stack (DESIGN.md surface-deep/surface/surface-raised
// + border), tinted off-white text, status hues as a color language.
const darkBase = {
  bg: "#0f090c", // surface-deep oklch(15% 0.01 350)
  surface: "#151012", // surface oklch(18% 0.01 350)
  surfaceAlt: "#20181c", // surface-raised oklch(22% 0.015 350)
  border: "#2f262a", // border oklch(28% 0.015 350)
  text: "#f5f0f2", // text-primary oklch(96% 0.005 350)
  textDim: "#aaa2a5", // text-secondary oklch(72% 0.01 350)
  textFaint: "#686164", // text-muted oklch(50% 0.01 350)
  onAccent: "#0f090c", // primary-button text = surface-deep (DESIGN.md), not white
  danger: "#f94144", // status-error oklch(65% 0.22 25)
  dangerBg: "#371210",
  star: "#edb417",
  successFg: "#4cc157", // status-ready oklch(72% 0.18 145)
  successBg: "#0e2510",
  warnFg: "#ebab00", // status-generating oklch(78% 0.18 85)
  warnBg: "#291d03",
} as const;

const lightBase = {
  bg: "#faf8f9", // light-surface oklch(98% 0.003 350)
  surface: "#f1edef",
  surfaceAlt: "#fdfbfc", // light-surface-raised oklch(99% 0.003 350)
  border: "#e1ddde", // light-border oklch(90% 0.005 350)
  text: "#151012", // light-text-primary oklch(18% 0.01 350)
  textDim: "#5a5356",
  textFaint: "#8a8487",
  onAccent: "#f5f0f2", // off-white text on the (darker) light-mode accents
  danger: "#d40924",
  dangerBg: "#ffdfda",
  star: "#a97600",
  successFg: "#097f23",
  successBg: "#d7f5d7",
  warnFg: "#a07100",
  warnBg: "#fbe9c6",
} as const;

function theme(accent: { dark: [string, string]; light: [string, string] }): Record<ColorScheme, ThemeColors> {
  return {
    dark: { ...darkBase, accent: accent.dark[0], accentStrong: accent.dark[1] },
    light: { ...lightBase, accent: accent.light[0], accentStrong: accent.light[1] },
  };
}

// Add a theme here and it appears in the Settings picker automatically.
// `magenta` is the brand default (DESIGN.md Electric Magenta). The other families
// are user-pickable alternates — none uses the banned violet/indigo/purple hue.
export const THEMES = {
  magenta: theme({ dark: ["#ef009c", "#b40074"], light: ["#cc0085", "#b40074"] }),
  ocean: theme({ dark: ["#4cc9f0", "#0096c7"], light: ["#0096c7", "#0077b6"] }),
  sunset: theme({ dark: ["#ff8fab", "#e5383b"], light: ["#e5383b", "#d00000"] }),
  forest: theme({ dark: ["#74c69d", "#2d9d6f"], light: ["#2d9d6f", "#1b7a52"] }),
} satisfies Record<string, Record<ColorScheme, ThemeColors>>;

export type ThemeName = keyof typeof THEMES;

export const THEME_LABELS: Record<ThemeName, string> = {
  magenta: "Magenta",
  ocean: "Ocean",
  sunset: "Sunset",
  forest: "Forest",
};

/** User preference for light/dark. */
export type ThemeMode = "system" | "dark" | "light";

// Back-compat exports (the default theme's palettes).
export const darkColors: ThemeColors = THEMES.magenta.dark;
export const lightColors: ThemeColors = THEMES.magenta.light;

// Font families (DESIGN.md: Geist Sans for chrome, Geist Mono for user-authored /
// identifying content — lyrics, prompts, style tags, IDs, slugs, timestamps).
// RN custom fonts bake weight into the family name, so each weight is its own key;
// set `fontFamily` (not `fontWeight`) when using these. Loaded in app/_layout.tsx.
export const fonts = {
  sans: "Geist_400Regular",
  sansMedium: "Geist_500Medium",
  sansSemibold: "Geist_600SemiBold",
  sansBold: "Geist_700Bold",
  sansExtrabold: "Geist_800ExtraBold",
  mono: "GeistMono_400Regular",
  monoMedium: "GeistMono_500Medium",
  monoSemibold: "GeistMono_600SemiBold",
} as const;
