import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getApiKey } from "@/auth/session";

// Root layout. Gates the app on a stored API key — no key → login. expo-audio is
// configured lazily on first playback (see src/playback/audio.ts), so no engine
// setup is needed here.
export default function RootLayout() {
  useEffect(() => {
    getApiKey()
      .then((key) => {
        if (!key) router.replace("/login");
      })
      .catch((e) => console.error("[auth] key check failed", e));
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0b0b0f" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#0b0b0f" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ presentation: "modal", title: "Now Playing" }} />
        <Stack.Screen name="playlist/[id]" options={{ title: "Playlist" }} />
      </Stack>
    </>
  );
}
