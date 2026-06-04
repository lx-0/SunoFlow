import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Tag as TagIcon } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchTags, type Tag } from "@/api/tags";

// Tags: browse the user's tags. Reloads on focus. Tap a tag to see its songs.
export default function TagsScreen() {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setTags(null);
      setError(null);
      fetchTags()
        .then(setTags)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load tags (HTTP ${e.status})` : "Network error");
          console.error("[tags] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Tags" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !tags ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : tags.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No tags yet. Tag songs in the web app.</Text></View>
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/tag/${item.id}`)}
            >
              <View style={[styles.dot, { backgroundColor: item.color ?? "#8b7cff" }]} />
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
              </View>
              {typeof item.songCount === "number" ? (
                <Text style={styles.count}>{item.songCount}</Text>
              ) : (
                <TagIcon color="#6a6a72" size={14} />
              )}
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
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  meta: { flex: 1 },
  title: { color: "#fff", fontSize: 16 },
  count: { color: "#6a6a72", fontSize: 13, fontVariant: ["tabular-nums"] },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
