import { Tabs } from "expo-router";

// Browse-first tab shell (iOS-v1 scope: Browse + Play + Playlists).
// Generate/Edit are deferred to a fast-follow milestone.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0b0b0f" },
        headerTintColor: "#fff",
        tabBarStyle: { backgroundColor: "#0b0b0f", borderTopColor: "#1c1c22" },
        tabBarActiveTintColor: "#fff",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Library" }} />
      <Tabs.Screen name="playlists" options={{ title: "Playlists" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
