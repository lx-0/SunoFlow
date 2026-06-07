import { Stack } from "expo-router";
import { SidebarToggle } from "@/components/Sidebar";
import { useTheme } from "@/theme/ThemeContext";

// Home base: the five primary screens (Library / Playlists / Favorites /
// History / Settings), each with the sidebar hamburger in the header. The
// persistent bottom tab bar + mini-player are rendered globally in the root
// layout so they survive drilling into any screen — see app/_layout.tsx and
// apps/mobile/NAVIGATION.md.
export default function PrimaryLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerLeft: () => <SidebarToggle />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Library" }} />
      <Stack.Screen name="playlists" options={{ title: "Playlists" }} />
      <Stack.Screen name="favorites" options={{ title: "Favorites" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
