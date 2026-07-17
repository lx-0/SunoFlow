import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, ListMusic, Heart, Clock, User, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import { registerTabNavigation } from "@/navigation";

// Custom tab bar for the Tabs navigator in app/(tabs)/_layout.tsx. Rendered
// in-flow below the screens (not as an overlay), so content never scrolls
// underneath it. Active state comes from the navigator, so the tab stays
// highlighted while drilled into a detail screen of that tab's stack.
//
// Presses dispatch at the navigator level (NAVIGATE-by-key / POP_TO_TOP), the
// same actions the stock react-navigation tab bar uses — a path-based
// router.navigate would push a duplicate anchor screen onto a drilled tab
// instead of resuming or popping its stack.
const TAB_CONTENT_HEIGHT = 49;

type Tab = { label: string; group: string; Icon: LucideIcon };
const TABS: Tab[] = [
  { label: "Library", group: "(library)", Icon: BookOpen },
  { label: "Playlists", group: "(playlists)", Icon: ListMusic },
  { label: "Favorites", group: "(favorites)", Icon: Heart },
  { label: "History", group: "(history)", Icon: Clock },
  { label: "Profile", group: "(profile)", Icon: User },
];

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const activeGroup = state.routes[state.index]?.name;

  // Expose the Tabs navigator to src/navigation.ts (sidebar tab rows,
  // closePlayerThen's active-group lookup, isAtTabRoot).
  useEffect(() => {
    registerTabNavigation(navigation);
    return () => registerTabNavigation(null);
  }, [navigation]);

  function onPressTab(group: string) {
    const route = state.routes.find((r) => r.name === group);
    if (!route) return;
    const focused = group === activeGroup;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      // Switch tab, leaving its stack exactly as the user left it. NAVIGATE by
      // NAME: the TabRouter resolves payload.name only (a key-only payload is
      // a silent no-op); no params, so the child stack is not reset.
      navigation.dispatch({ type: "NAVIGATE", payload: { name: route.name, merge: true }, target: state.key });
    } else if (focused) {
      // Re-tap on the active tab pops its stack back to the anchor screen.
      const child = route.state as { key?: string; index?: number } | undefined;
      if (child?.key && (child.index ?? 0) > 0) {
        navigation.dispatch({ type: "POP_TO_TOP", target: child.key });
      }
    }
  }

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: TAB_CONTENT_HEIGHT + insets.bottom }]}>
      {TABS.map((t) => {
        const active = t.group === activeGroup;
        const tint = active ? colors.accent : colors.textFaint;
        return (
          <Pressable
            key={t.group}
            style={styles.tab}
            onPress={() => onPressTab(t.group)}
            accessibilityRole="button"
            accessibilityLabel={`${t.label} tab`}
            accessibilityState={{ selected: active }}
          >
            <t.Icon color={tint} size={23} />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingTop: 7 },
    label: { fontSize: 11, fontWeight: "600" },
  });
}
