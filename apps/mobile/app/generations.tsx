import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchGenerations, type Generation } from "@/api/generations";
import { playQueue } from "@/playback/controls";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Generations: read-only history of the user's generation jobs + their status.
// Reloads on focus. Rows whose job produced a playable song are tappable (play it);
// in-flight or failed rows are non-interactive. Generating new songs is deferred.

// Normalize the backend's free-form status into a small set with distinct colors.
type Badge = { label: string; bg: string; fg: string };

function statusBadge(raw: string): Badge {
  const s = raw.toLowerCase();
  if (s === "ready" || s === "complete" || s === "completed" || s === "success" || s === "succeeded") {
    return { label: "Ready", bg: "#16331f", fg: "#5cd17e" };
  }
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") {
    return { label: "Failed", bg: "#3a1a1d", fg: "#ff7a85" };
  }
  if (s === "processing" || s === "running" || s === "generating" || s === "in_progress") {
    return { label: "Processing", bg: "#2a2440", fg: "#b3a7ff" };
  }
  if (s === "pending" || s === "queued" || s === "waiting" || s === "submitted") {
    return { label: "Pending", bg: "#2c2a1a", fg: "#e0cf6a" };
  }
  return { label: raw || "Unknown", bg: "#1c1c22", fg: "#9a9aa2" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function GenerationsScreen() {
  const [items, setItems] = useState<Generation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  useFocusEffect(
    useCallback(() => {
      setItems(null);
      setError(null);
      fetchGenerations()
        .then(setItems)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load generations (HTTP ${e.status})` : "Network error");
          console.error("[generations] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Generations" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !items ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : items.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No generations yet.</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => {
            const badge = statusBadge(item.status);
            const label = item.title ?? item.prompt ?? "Untitled";
            const playable: Song | null = item.song;
            const Row = (
              <View style={styles.row}>
                <View style={styles.meta}>
                  <Text style={styles.title} numberOfLines={1}>{label}</Text>
                  <View style={styles.subRow}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                    </View>
                    {item.createdAt ? <Text style={styles.date}>{formatDate(item.createdAt)}</Text> : null}
                  </View>
                </View>
              </View>
            );
            if (!playable) return Row;
            return (
              <Pressable
                onPress={async () => {
                  try {
                    await playQueue([playable], 0);
                    router.push("/player");
                  } catch (e) {
                    console.error("[generations] play failed", e);
                  }
                }}
              >
                {Row}
              </Pressable>
            );
          }}
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
    meta: { flex: 1 },
    title: { color: c.text, fontSize: 16 },
    subRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
    badgeText: { fontSize: 11, fontWeight: "600" },
    date: { color: c.textDim, fontSize: 13 },
    dim: { color: c.textDim, fontSize: 13 },
  });
}
