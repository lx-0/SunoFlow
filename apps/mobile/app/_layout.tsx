import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { setupPlayer } from "@/playback/setup";

// Root layout. Initialises the audio engine once on mount; the playback service
// (registered in index.js) handles lock-screen / Control Center commands.
export default function RootLayout() {
  useEffect(() => {
    setupPlayer().catch((e) => console.error("[player] setup failed", e));
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: "#0b0b0f" }, headerTintColor: "#fff", contentStyle: { backgroundColor: "#0b0b0f" } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ presentation: "modal", title: "Now Playing" }} />
      </Stack>
    </>
  );
}
