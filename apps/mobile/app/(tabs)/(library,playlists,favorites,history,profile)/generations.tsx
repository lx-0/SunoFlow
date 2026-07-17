import { useCallback, useRef, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { Stack, router, useFocusEffect } from "expo-router";
import { goToSection } from "@/navigation";
import { Sparkles, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchGenerations, type Generation } from "@/api/generations";
import { playQueue } from "@/playback/controls";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Generations: read-only history of the user's generation jobs + their status.
// Reloads on focus. Rows whose job produced a playable song are tappable (play it);
// in-flight or failed rows are non-interactive. Generating new songs is deferred.

// Normalize the backend's free-form status into a small set with distinct colors.
type Badge = { label: string; bg: string; fg: string };

function statusBadge(raw: string, c: ThemeColors): Badge {
  const s = raw.toLowerCase();
  if (s === "ready" || s === "complete" || s === "completed" || s === "success" || s === "succeeded") {
    return { label: "Ready", bg: c.successBg, fg: c.successFg };
  }
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") {
    return { label: "Failed", bg: c.dangerBg, fg: c.danger };
  }
  if (s === "processing" || s === "running" || s === "generating" || s === "in_progress") {
    return { label: "Processing", bg: c.warnBg, fg: c.warnFg };
  }
  if (s === "pending" || s === "queued" || s === "waiting" || s === "submitted") {
    return { label: "Pending", bg: c.warnBg, fg: c.warnFg };
  }
  return { label: raw || "Unknown", bg: c.surfaceAlt, fg: c.textDim };
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
  const [refreshing, setRefreshing] = useState(false);
  // Latest-data ref so the focus callback can check for existing data without
  // depending on `items` (which would re-run the focus effect on every load).
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const load = useCallback(() => {
    setError(null);
    return fetchGenerations()
      .then(setItems)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load generations (HTTP ${e.status})` : "Network error");
        console.error("[generations] load failed", e);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Stale-while-revalidate: with data already shown, revalidate silently and
      // swap it in on success; only clear (→ spinner) on first load / after an error.
      if (!itemsRef.current) setItems(null);
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Generations" }} />
      {error && !items ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !items ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : items.length === 0 ? (
        <EmptyState
          Icon={Sparkles}
          title="No generations yet"
          subtitle="Create your first song to see it here."
          ctaLabel="Generate a song"
          onCta={() => goToSection("/generate")}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textDim} />
          }
          renderItem={({ item }) => {
            const badge = statusBadge(item.status, colors);
            const label = item.title ?? item.prompt ?? "Untitled";
            const labelIsPrompt = !item.title && !!item.prompt;
            const playable: Song | null = item.song;
            const Row = (
              <View style={styles.row}>
                <View style={styles.meta}>
                  <Text style={[styles.title, labelIsPrompt && styles.titlePrompt]} numberOfLines={1}>{label}</Text>
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
                    router.navigate("/player");
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
    titlePrompt: { fontFamily: fonts.mono },
    subRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginRight: 8 },
    badgeText: { fontSize: 11, fontWeight: "600" },
    date: { color: c.textDim, fontSize: 13 },
  });
}
