import { View } from "react-native";
import { Stack } from "expo-router";
import { MiniPlayer } from "@/components/MiniPlayer";
import { SidebarToggle } from "@/components/Sidebar";

// Primary screens shell. Navigation is the slide-in Sidebar (hamburger in the
// header) instead of a bottom tab bar — the feature set outgrew the tab bar and
// this mirrors the PWA's sidebar. A persistent MiniPlayer floats at the bottom.
export default function PrimaryLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0b0b0f" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#0b0b0f" },
          headerLeft: () => <SidebarToggle />,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Library" }} />
        <Stack.Screen name="playlists" options={{ title: "Playlists" }} />
        <Stack.Screen name="favorites" options={{ title: "Favorites" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
      <MiniPlayer />
    </View>
  );
}
