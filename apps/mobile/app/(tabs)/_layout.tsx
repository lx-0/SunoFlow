import { View } from "react-native";
import { Stack } from "expo-router";
import { MiniPlayer, TAB_BAR_HEIGHT } from "@/components/MiniPlayer";
import { SidebarToggle } from "@/components/Sidebar";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useTheme } from "@/theme/ThemeContext";

// Primary screens shell. A custom bottom tab bar covers the core views (Library /
// Playlists / Favorites / History / Settings); the slide-in Sidebar (hamburger in
// the header) still reaches everything else. A MiniPlayer floats above the tab bar.
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
      <MiniPlayer tabBarHeight={TAB_BAR_HEIGHT} />
      <BottomTabBar />
    </View>
  );
}
