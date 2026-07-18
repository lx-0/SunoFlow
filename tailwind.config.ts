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
