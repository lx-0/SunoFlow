import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Flame, Trophy } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchStreaks,
  fetchMilestones,
  fetchUserStats,
  type Streak,
  type Milestone,
  type UserStats,
} from "@/api/stats";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

type Styles = ReturnType<typeof makeStyles>;

interface StatsData {
  streak: Streak;
  milestones: Milestone[];
  stats: UserStats;
}

// Read-only insights: streak summary, headline numbers, milestone list. Fetches
// all three endpoints together; reloads on focus. Each section guards its own
// data so a sparse response simply renders less.
export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setData(null);
      setError(null);
      Promise.all([fetchStreaks(), fetchMilestones(), fetchUserStats()])
        .then(([streak, milestones, stats]) => setData({ streak, milestones, stats }))
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load stats (HTTP ${e.status})` : "Network error");
          console.error("[stats] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Your Stats" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !data ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <StreakCard streak={data.streak} styles={styles} colors={colors} />
          <HeadlineStats stats={data.stats} styles={styles} />
          <Milestones milestones={data.milestones} styles={styles} colors={colors} />
        </ScrollView>
      )}
    </View>
  );
}

function StreakCard({ streak, styles, colors }: { streak: Streak; styles: Styles; colors: ThemeColors }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Flame color={colors.accent} size={18} />
        <Text style={styles.cardTitle}>Streak</Text>
      </View>
      <View style={styles.streakRow}>
        <View style={styles.streakItem}>
          <Text style={styles.bigNum}>{streak.currentStreak}</Text>
          <Text style={styles.dim}>Current</Text>
        </View>
        <View style={styles.streakItem}>
          <Text style={styles.bigNum}>{streak.longestStreak}</Text>
          <Text style={styles.dim}>Longest</Text>
        </View>
      </View>
    </View>
  );
}

function HeadlineStats({ stats, styles }: { stats: UserStats; styles: Styles }) {
  const items: Array<{ label: string; value: string }> = [
    { label: "Songs", value: String(stats.totalGenerations) },
    { label: "Completed", value: String(stats.completedGenerations) },
    { label: "Favorites", value: String(stats.totalFavorites) },
    { label: "Playlists", value: String(stats.totalPlaylists) },
    { label: "Avg Rating", value: stats.averageRating != null ? stats.averageRating.toFixed(1) : "–" },
    { label: "Rated", value: String(stats.ratedSongsCount) },
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Overview</Text>
      <View style={styles.grid}>
        {items.map((it) => (
          <View key={it.label} style={styles.gridItem}>
            <Text style={styles.gridNum}>{it.value}</Text>
            <Text style={styles.dim}>{it.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Milestones({ milestones, styles, colors }: { milestones: Milestone[]; styles: Styles; colors: ThemeColors }) {
  if (milestones.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Trophy color={colors.accent} size={18} />
        <Text style={styles.cardTitle}>Milestones</Text>
      </View>
      {milestones.map((m) => (
        <View key={m.type} style={[styles.milestone, !m.achieved && styles.locked]}>
          <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
          <View style={styles.milestoneMeta}>
            <Text style={[styles.milestoneLabel, !m.achieved && styles.lockedText]} numberOfLines={1}>
              {m.label}
            </Text>
            <Text style={styles.dim} numberOfLines={1}>{m.description}</Text>
          </View>
          <Text style={[styles.badge, m.achieved ? styles.badgeOn : styles.badgeOff]}>
            {m.achieved ? "Earned" : "Locked"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    scroll: { padding: 16, gap: 16 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 16,
    },
    cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    cardTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
    streakRow: { flexDirection: "row" },
    streakItem: { flex: 1, alignItems: "center" },
    bigNum: { color: c.accent, fontSize: 36, fontWeight: "800", fontVariant: ["tabular-nums"] },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    gridItem: { width: "33.33%", paddingVertical: 10, alignItems: "center" },
    gridNum: { color: c.text, fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },
    milestone: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    locked: { opacity: 0.5 },
    milestoneEmoji: { fontSize: 22 },
    milestoneMeta: { flex: 1 },
    milestoneLabel: { color: c.text, fontSize: 15, fontWeight: "600" },
    lockedText: { color: c.textDim },
    badge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
    badgeOn: { color: c.accent, backgroundColor: "rgba(139,124,255,0.15)" },
    badgeOff: { color: c.textFaint, backgroundColor: "rgba(154,154,162,0.1)" },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
