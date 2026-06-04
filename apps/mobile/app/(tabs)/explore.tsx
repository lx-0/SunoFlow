import { Text, Pressable, FlatList, StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { Compass, Sparkles, LayoutGrid, BarChart3, Bell, ChevronRight, type LucideIcon } from "lucide-react-native";

// Explore hub: entry point to the browse + insight surfaces migrated from the web
// (each is its own pushed screen). Keeps the bottom tab bar lean.
type Entry = { label: string; route: Href; Icon: LucideIcon };

const ENTRIES: Entry[] = [
  { label: "Discover", route: "/discover", Icon: Compass },
  { label: "Smart Playlists", route: "/smart-playlists", Icon: Sparkles },
  { label: "Collections", route: "/collections", Icon: LayoutGrid },
  { label: "Your Stats", route: "/stats", Icon: BarChart3 },
  { label: "Notifications", route: "/notifications", Icon: Bell },
];

export default function ExploreScreen() {
  return (
    <FlatList
      style={styles.container}
      data={ENTRIES}
      keyExtractor={(e) => e.label}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => router.push(item.route)}>
          <item.Icon color="#8b7cff" size={22} />
          <Text style={styles.label}>{item.label}</Text>
          <ChevronRight color="#5a5a62" size={20} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { color: "#fff", fontSize: 16, flex: 1 },
});
