import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// Wave-0 accent bridge (DESIGN.md "Electric Magenta", hue 350): the stock
// violet ramp re-hued to magenta with each step's OKLCH lightness preserved
// (chroma gamut-clipped), so every existing violet-* utility recolors in
// place with contrast ratios intact. Chrome literals (PWA themeColor, focus
// ring, --accent) use the canonical brand hex #ef009c instead — see
// apps/mobile/src/theme/theme.ts. purple-*/indigo-* are deliberately NOT
// aliased: they carry status-like meaning (mood color map, notification-type
// colors, A-vs-B compare) that must stay distinguishable from the accent.
const magenta = {
  50: "#fef1f6",
  100: "#fce5ef",
  200: "#facee1",
  300: "#f4a6ca",
  400: "#e873af",
  500: "#d93294",
  600: "#c40181",
  700: "#ac0170",
  800: "#91005e",
  900: "#79004e",
  950: "#4f0031",
};

// A0 neutral retint (DESIGN.md Tinted-Neutrals rule: no untinted gray, no pure
// black/white): the stock blue-gray ramp re-tinted to hue 350, parallel to the
// violet bridge above. The dark end lands exactly on the DESIGN.md surface
// stack (950→surface-deep, 900→surface, 800→surface-raised, 700→surface-hover,
// 600→border-strong, 500→text-muted, 400→text-secondary) so every existing
// dark:bg-gray-N utility becomes a Late-Night-Studio-Console plane; the light
// end (50-300) keeps each stock step's OKLCH lightness so light mode stays
// near-white and per-step contrast survives. Hex source: DESIGN.md OKLCH →
// sRGB, matching apps/mobile/src/theme/theme.ts.
const gray = {
  50: "#faf8f9",
  100: "#f1edef",
  200: "#eae5e7",
  300: "#d8d3d5",
  400: "#aaa2a5",
  500: "#686164",
  600: "#514349",
  700: "#2a2125",
  800: "#20181c",
  900: "#151012",
  950: "#0f090c",
};

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        violet: magenta,
        gray,
        // Semantic tokens backed by the globals.css vars (they flip with the
        // `.dark` class): write `bg-surface-raised text-primary border-border`
        // instead of paired light/dark gray literals. Migrate on touch.
        surface: {
          DEFAULT: "var(--surface)",
          deep: "var(--surface-deep)",
          raised: "var(--surface-raised)",
          hover: "var(--surface-hover)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        status: {
          ready: "var(--status-ready)",
          generating: "var(--status-generating)",
          error: "var(--status-error)",
          info: "var(--status-info)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...defaultTheme.fontFamily.mono],
      },
      keyframes: {
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(0.5rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.2s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
