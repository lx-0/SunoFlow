import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getApiKey } from "@/auth/session";
import { SidebarProvider, Sidebar } from "@/components/Sidebar";
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
      <Sidebar />
    </SidebarProvider>
  );
}
