import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { BottomTabBar } from "@/components/BottomTabBar";
import { MiniPlayer, TAB_BAR_HEIGHT } from "@/components/MiniPlayer";
import { PermanentSidebar } from "@/components/Sidebar";
import { useLayout } from "@/theme/layout";

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
//
// From the `medium` breakpoint up (iPad), the shell turns into a two-column
// layout: a permanent sidebar rail beside the content column. BottomTabBar stays
// mounted but renders null — it owns the navigator registration. The MiniPlayer
// lives INSIDE the content column, so it spans the content and never floats over
// the rail.
export default function TabsLayout() {
  const { isWide } = useLayout();

  return (
    <View style={[styles.fill, isWide && styles.row]}>
      {isWide ? <PermanentSidebar /> : null}
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
        <MiniPlayer tabBarHeight={isWide ? 0 : TAB_BAR_HEIGHT} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 }, row: { flexDirection: "row" } });
