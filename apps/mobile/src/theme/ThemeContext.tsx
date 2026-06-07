import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { THEMES, type ColorScheme, type ThemeColors, type ThemeMode, type ThemeName } from "./theme";

const MODE_KEY = "sunoflow.themeMode";
const THEME_KEY = "sunoflow.themeName";

function isThemeName(v: string | null): v is ThemeName {
  return v !== null && v in THEMES;
}

interface ThemeCtx {
  colors: ThemeColors;
  scheme: ColorScheme; // resolved (after applying system)
  mode: ThemeMode; // user preference
  setMode: (mode: ThemeMode) => void;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  colors: THEMES.magenta.dark,
  scheme: "dark",
  mode: "system",
  setMode: () => {},
  themeName: "magenta",
  setThemeName: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [themeName, setThemeNameState] = useState<ThemeName>("magenta");

  useEffect(() => {
    SecureStore.getItemAsync(MODE_KEY)
      .then((v) => {
        if (v === "dark" || v === "light" || v === "system") setModeState(v);
      })
      .catch(() => {});
    SecureStore.getItemAsync(THEME_KEY)
      .then((v) => {
        if (isThemeName(v)) setThemeNameState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(MODE_KEY, next).catch(() => {});
  };
  const setThemeName = (next: ThemeName) => {
    setThemeNameState(next);
    SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
  };

  const scheme: ColorScheme = mode === "system" ? (system === "light" ? "light" : "dark") : mode;
  const value = useMemo<ThemeCtx>(
    () => ({ colors: THEMES[themeName][scheme], scheme, mode, setMode, themeName, setThemeName }),
    [scheme, mode, themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
