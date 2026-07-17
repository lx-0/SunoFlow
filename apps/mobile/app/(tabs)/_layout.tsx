import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { BottomTabBar } from "@/components/BottomTabBar";
import { MiniPlayer, TAB_BAR_HEIGHT } from "@/components/MiniPlayer";

// The five primary sections as REAL tabs: switching is instant (no push
// animation), each tab keeps its own navigation stack and scroll position, and
// the active tab stays highlighted while drilled into a detail screen. All
// section/detail screens live in the shared route group
// `(library,playlists,favorites,history,profile)` so every tab can push any of
// them onto its own stack — see apps/mobile/NAVIGATION.md.
//
// The custom BottomTabBar renders in-flow (screens end above it); the
// MiniPlayer floats above the bar as an overlay. Both are inside this layout,
// so login and the Now-Playing modal (root-level screens) hide them for free.
export default function TabsLayout() {
  return (
    <View style={styles.fill}>
      <Tabs
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{ headerShown: false, freezeOnBlur: true }}
      >
        <Tabs.Screen name="(library)" />
        <Tabs.Screen name="(playlists)" />
        <Tabs.Screen name="(favorites)" />
        <Tabs.Screen name="(history)" />
        <Tabs.Screen name="(profile)" />
      </Tabs>
      <MiniPlayer tabBarHeight={TAB_BAR_HEIGHT} />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
