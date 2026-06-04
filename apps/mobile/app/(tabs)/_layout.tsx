import { View } from "react-native";
import { Stack } from "expo-router";
import { MiniPlayer } from "@/components/MiniPlayer";
import { SidebarToggle } from "@/components/Sidebar";
import { useTheme } from "@/theme/ThemeContext";

// Primary screens shell. Navigation is the slide-in Sidebar (hamburger in the
// header) instead of a bottom tab bar. A MiniPlayer floats at the bottom.
export default function PrimaryLayout() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
      <MiniPlayer />
    </View>
  );
}
