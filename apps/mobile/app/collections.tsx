import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Library, ChevronRight } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchCollections, type CollectionSummary } from "@/api/collections";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Curated public collections. Reloads on focus. Tap a row → detail screen.
export default function CollectionsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
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
              <Library color={colors.accent} size={20} />
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.dim}>{item.songCount} {item.songCount === 1 ? "song" : "songs"}</Text>
              </View>
              <ChevronRight color={colors.textDim} size={18} />
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
    meta: { flex: 1, marginLeft: 14 },
    title: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
