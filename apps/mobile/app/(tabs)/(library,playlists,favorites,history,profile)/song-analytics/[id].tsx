import { useCallback, useState } from "react";
import { View, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchSongAnalytics, type SongAnalytics } from "@/api/song-analytics";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, type ThemeColors } from "@/theme/theme";

type Styles = ReturnType<typeof makeStyles>;

// Read-only per-song analytics: headline plays/views tiles plus a pure-RN 7-day
// views bar chart (no chart lib). Reloads on focus. Defensive against a missing
// or zero-count series — bars fall back to a minimal sliver so the row stays
// visible.
export default function SongAnalyticsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<SongAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setError("No song specified");
        return;
      }
      setData(null);
      setError(null);
      fetchSongAnalytics(id)
        .then(setData)
        .catch((e: unknown) => {
          setError(
            e instanceof HttpError
              ? `Couldn't load analytics (HTTP ${e.status})`
              : "Network error",
          );
          console.error("[song-analytics] load failed", e);
        });
    }, [id]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Song Analytics" }} />
      {error ? (
        <EmptyState Icon={TriangleAlert} title={error} tone="error" />
      ) : !data ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Header data={data} styles={styles} />
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Totals</Text>
            <StatRow value={data.totalPlays} label="Total plays" styles={styles} />
            <StatRow value={data.totalViews} label="Total views" styles={styles} />
          </View>
          <ViewsChart views7d={data.views7d} styles={styles} colors={colors} />
        </ScrollView>
      )}
    </View>
  );
}

function Header({ data, styles }: { data: SongAnalytics; styles: Styles }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={2}>{data.title}</Text>
      <Text style={[styles.badge, data.isPublic ? styles.badgeOn : styles.badgeOff]}>
        {data.isPublic ? "Public" : "Private"}
      </Text>
    </View>
  );
}

function StatRow({ value, label, styles }: { value: number; label: string; styles: Styles }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ViewsChart({
  views7d,
  styles,
  colors,
}: {
  views7d: SongAnalytics["views7d"];
  styles: Styles;
  colors: ThemeColors;
}) {
  const CHART_HEIGHT = 120;
  const MIN_RATIO = 0.04; // keep a visible sliver even at zero
  const max = views7d.reduce((m, v) => (v.count > m ? v.count : m), 0);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Views (last 7 days)</Text>
      <View style={[styles.chart, { height: CHART_HEIGHT }]}>
        {views7d.map((v) => {
          const ratio = max === 0 ? MIN_RATIO : Math.max(MIN_RATIO, v.count / max);
          const fillHeight = Math.round(CHART_HEIGHT * ratio);
          let weekday = "";
          try {
            weekday = new Date(`${v.date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "narrow",
            });
          } catch {
            weekday = "";
          }
          return (
            <View key={v.date} style={styles.barCol}>
              <Text style={styles.barCount}>{v.count}</Text>
              <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                <View
                  style={[styles.barFill, { height: fillHeight, backgroundColor: colors.textDim }]}
                />
              </View>
              <Text style={styles.barLabel}>{weekday}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    scroll: { padding: 16, gap: 16, paddingBottom: MINIPLAYER_CLEARANCE },
    header: { flexDirection: "row", alignItems: "center", gap: 12 },
    title: { flex: 1, color: c.text, fontSize: 18, fontWeight: "600" },
    badge: {
      fontSize: 11,
      fontWeight: "700",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: "hidden",
    },
    badgeOn: { color: c.onAccent, backgroundColor: c.accentStrong },
    badgeOff: { color: c.textDim, backgroundColor: c.surfaceAlt },
    infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    infoLabel: { color: c.textDim, fontSize: 15 },
    infoValue: { color: c.text, fontSize: 16, fontFamily: fonts.monoMedium, fontVariant: ["tabular-nums"] },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 16,
      gap: 10,
    },
    cardTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
    chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    barCol: { flex: 1, alignItems: "center", gap: 6 },
    barCount: { color: c.textDim, fontSize: 11, fontFamily: fonts.mono, fontVariant: ["tabular-nums"] },
    barTrack: {
      width: 14,
      backgroundColor: c.surfaceAlt,
      borderRadius: 7,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    barFill: { width: "100%", borderRadius: 7 },
    barLabel: { color: c.textFaint, fontSize: 11, fontWeight: "600" },
  });
}
