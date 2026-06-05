import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, ListMusic, Heart, Clock, User, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Custom bottom tab bar for the primary views. Pure RN (no @react-navigation
// bottom-tabs dependency) — it just reads the active route and navigates. The
// (tabs) layout stays a Stack; this bar overlays it.
const TAB_CONTENT_HEIGHT = 49;

type Tab = { label: string; route: string; Icon: LucideIcon };
const TABS: Tab[] = [
  { label: "Library", route: "/", Icon: BookOpen },
  { label: "Playlists", route: "/playlists", Icon: ListMusic },
  { label: "Favorites", route: "/favorites", Icon: Heart },
  { label: "History", route: "/history", Icon: Clock },
  { label: "Profile", route: "/profile", Icon: User },
];

export function BottomTabBar() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: TAB_CONTENT_HEIGHT + insets.bottom }]}>
      {TABS.map((t) => {
        const active = t.route === "/" ? pathname === "/" : pathname === t.route;
        const tint = active ? colors.accent : colors.textFaint;
        return (
          <Pressable
            key={t.route}
            style={styles.tab}
            onPress={() => { if (!active) router.navigate(t.route as Href); }}
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
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      backgroundColor: c.surface,
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingTop: 7 },
    label: { fontSize: 11, fontWeight: "600" },
  });
}
