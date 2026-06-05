import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Tag as TagIcon, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchTags, type Tag } from "@/api/tags";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Tags: browse the user's tags. Reloads on focus. Tap a tag to see its songs.
export default function TagsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !tags ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : tags.length === 0 ? (
        <EmptyState
          Icon={TagIcon}
          title="No tags yet"
          subtitle="Tag songs in the web app to organize them here."
        />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/tag/${item.id}`)}
            >
              <View style={[styles.dot, { backgroundColor: item.color ?? colors.accent }]} />
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
              </View>
              {typeof item.songCount === "number" ? (
                <Text style={styles.count}>{item.songCount}</Text>
              ) : (
                <TagIcon color={colors.textFaint} size={14} />
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    meta: { flex: 1 },
    title: { color: c.text, fontSize: 16 },
    count: { color: c.textDim, fontSize: 13, fontVariant: ["tabular-nums"] },
  });
}
