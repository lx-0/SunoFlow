// Centralized design tokens. Every screen/component should pull colors from here
// (via useTheme()) instead of hardcoding hex, so dark/light — and additional
// themes later — work app-wide. Add a new theme by adding a ThemeColors palette
// to THEMES and a ThemeName entry.

export interface ThemeColors {
  /** screen background */
  bg: string;
  /** cards, inputs, raised rows */
  surface: string;
  /** secondary raised surface / chips */
  surfaceAlt: string;
  /** hairline borders / dividers */
  border: string;
  /** primary text */
  text: string;
  /** secondary/muted text */
  textDim: string;
  /** faint text / placeholders */
  textFaint: string;
  /** brand accent (icons, active states) */
  accent: string;
  /** stronger accent (filled buttons) */
  accentStrong: string;
  /** text/icon on top of accentStrong */
  onAccent: string;
  /** destructive / favorite heart */
  danger: string;
  /** rating stars */
  star: string;
}

export const darkColors: ThemeColors = {
  bg: "#0b0b0f",
  surface: "#15151b",
  surfaceAlt: "#1c1c22",
  border: "#1c1c22",
  text: "#ffffff",
  textDim: "#9a9aa2",
  textFaint: "#6a6a72",
  accent: "#8b7cff",
  accentStrong: "#7c3aed",
  onAccent: "#ffffff",
  danger: "#ff4d6d",
  star: "#f5c518",
};

export const lightColors: ThemeColors = {
  bg: "#ffffff",
  surface: "#f4f4f7",
  surfaceAlt: "#e9e9ee",
  border: "#e3e3e8",
  text: "#0b0b0f",
  textDim: "#5c5c66",
  textFaint: "#9a9aa2",
  accent: "#7c3aed",
  accentStrong: "#7c3aed",
  onAccent: "#ffffff",
  danger: "#e11d48",
  star: "#c79100",
};

export type ColorScheme = "dark" | "light";

/** All available themes. Extend this map to add more (e.g. an "oled" or branded theme). */
export const THEMES: Record<ColorScheme, ThemeColors> = {
  dark: darkColors,
  light: lightColors,
};

/** User preference: follow the OS, or force one. */
export type ThemeMode = "system" | "dark" | "light";
