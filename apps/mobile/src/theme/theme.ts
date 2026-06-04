// Centralized design tokens. Screens pull colors via useTheme() — never hardcode
// hex — so dark/light AND multiple named themes work app-wide. A theme is a named
// palette family with a dark + light variant; the user picks the theme (accent
// family) and the mode (dark/light/system) independently.

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
const darkBase = {
  bg: "#0b0b0f",
  surface: "#15151b",
  surfaceAlt: "#1c1c22",
  border: "#1c1c22",
  text: "#ffffff",
  textDim: "#9a9aa2",
  textFaint: "#6a6a72",
  onAccent: "#ffffff",
  danger: "#ff6b81",
  dangerBg: "#3a1a1d",
  star: "#f5c518",
  successFg: "#5cd17e",
  successBg: "#16331f",
  warnFg: "#e0cf6a",
  warnBg: "#2c2a1a",
} as const;

const lightBase = {
  bg: "#ffffff",
  surface: "#f4f4f7",
  surfaceAlt: "#e9e9ee",
  border: "#e3e3e8",
  text: "#0b0b0f",
  textDim: "#5c5c66",
  textFaint: "#9a9aa2",
  onAccent: "#ffffff",
  danger: "#e11d48",
  dangerBg: "#fee2e2",
  star: "#c79100",
  successFg: "#15803d",
  successBg: "#dcfce7",
  warnFg: "#a16207",
  warnBg: "#fef9c3",
} as const;

function theme(accent: { dark: [string, string]; light: [string, string] }): Record<ColorScheme, ThemeColors> {
  return {
    dark: { ...darkBase, accent: accent.dark[0], accentStrong: accent.dark[1] },
    light: { ...lightBase, accent: accent.light[0], accentStrong: accent.light[1] },
  };
}

// Add a theme here and it appears in the Settings picker automatically.
export const THEMES = {
  violet: theme({ dark: ["#8b7cff", "#7c3aed"], light: ["#7c3aed", "#7c3aed"] }),
  ocean: theme({ dark: ["#4cc9f0", "#0096c7"], light: ["#0096c7", "#0077b6"] }),
  sunset: theme({ dark: ["#ff8fab", "#e5383b"], light: ["#e5383b", "#d00000"] }),
  forest: theme({ dark: ["#74c69d", "#2d9d6f"], light: ["#2d9d6f", "#1b7a52"] }),
} satisfies Record<string, Record<ColorScheme, ThemeColors>>;

export type ThemeName = keyof typeof THEMES;

export const THEME_LABELS: Record<ThemeName, string> = {
  violet: "Violet",
  ocean: "Ocean",
  sunset: "Sunset",
  forest: "Forest",
};

/** User preference for light/dark. */
export type ThemeMode = "system" | "dark" | "light";

// Back-compat exports (the default theme's palettes).
export const darkColors: ThemeColors = THEMES.violet.dark;
export const lightColors: ThemeColors = THEMES.violet.light;
