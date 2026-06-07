import { useEffect } from "react";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getApiKey } from "@/auth/session";
import { SidebarProvider, Sidebar } from "@/components/Sidebar";
import { MiniPlayer, TAB_BAR_HEIGHT } from "@/components/MiniPlayer";
import { BottomTabBar } from "@/components/BottomTabBar";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";

// Root layout. ThemeProvider supplies colors app-wide (dark/light, persisted).
// Gates the app on a stored API key — no key → login.
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNav />
    </ThemeProvider>
  );
}

// Persistent chrome (bottom tab bar + mini-player) rendered once, globally, so
// it survives navigating into any section or detail screen — the native
// music-app pattern. Hidden on login and on the full-screen Now-Playing modal.
function GlobalChrome() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/player") return null;
  return (
    <>
      <MiniPlayer tabBarHeight={TAB_BAR_HEIGHT} />
      <BottomTabBar />
    </>
  );
}

function RootNav() {
  const { colors, scheme } = useTheme();

  useEffect(() => {
    getApiKey()
      .then((key) => {
        if (!key) router.replace("/login");
      })
      .catch((e) => console.error("[auth] key check failed", e));
  }, []);

  return (
    <SidebarProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ presentation: "modal", title: "Now Playing" }} />
        <Stack.Screen name="playlist/[id]" options={{ title: "Playlist" }} />
      </Stack>
      {/* Chrome before Sidebar so the drawer overlays the tab bar when open. */}
      <GlobalChrome />
      <Sidebar />
    </SidebarProvider>
  );
}
