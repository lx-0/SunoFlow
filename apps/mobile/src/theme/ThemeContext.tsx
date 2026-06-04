import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { THEMES, type ColorScheme, type ThemeColors, type ThemeMode } from "./theme";

const MODE_KEY = "sunoflow.themeMode";

interface ThemeCtx {
  colors: ThemeColors;
  scheme: ColorScheme; // resolved (after applying system)
  mode: ThemeMode; // user preference
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  colors: THEMES.dark,
  scheme: "dark",
  mode: "system",
  setMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Restore the saved preference once.
  useEffect(() => {
    SecureStore.getItemAsync(MODE_KEY)
      .then((v) => {
        if (v === "dark" || v === "light" || v === "system") setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(MODE_KEY, next).catch(() => {});
  };

  const scheme: ColorScheme = mode === "system" ? (system === "light" ? "light" : "dark") : mode;
  const value = useMemo<ThemeCtx>(
    () => ({ colors: THEMES[scheme], scheme, mode, setMode }),
    [scheme, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
