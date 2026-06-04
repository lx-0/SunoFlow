import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Library, ChevronRight } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchCollections, type CollectionSummary } from "@/api/collections";

// Curated public collections. Reloads on focus. Tap a row → detail screen.
export default function CollectionsScreen() {
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setCollections(null);
      setError(null);
      fetchCollections()
        .then(setCollections)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load collections (HTTP ${e.status})` : "Network error");
          console.error("[collections] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Collections" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !collections ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : collections.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No collections yet.</Text></View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/collection/${item.id}`)}
            >
              <Library color="#8b7cff" size={20} />
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.dim}>{item.songCount} {item.songCount === 1 ? "song" : "songs"}</Text>
              </View>
              <ChevronRight color="#9a9aa2" size={18} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: { flex: 1, marginLeft: 14 },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
