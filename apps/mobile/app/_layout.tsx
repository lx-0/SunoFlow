import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { setupPlayer } from "@/playback/setup";
import { getApiKey } from "@/auth/session";

// Root layout. Initialises the audio engine once (the playback service in
// index.js handles lock-screen / Control Center commands), and gates the app
// on a stored API key — no key → login.
export default function RootLayout() {
  useEffect(() => {
    setupPlayer().catch((e) => console.error("[player] setup failed", e));
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
      </Stack>
    </>
  );
}
