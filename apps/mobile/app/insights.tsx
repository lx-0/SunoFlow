import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { BarChart3 } from "lucide-react-native";
import type { InsightsResult, TagStat, ComboStat, WeeklyDataPoint } from "@sunoflow/core";
import { HttpError } from "@/api/client";
import { fetchInsights } from "@/api/insights";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

type Styles = ReturnType<typeof makeStyles>;

// Insights → "feedback analytics": which tags/styles your audience likes. Aggregates
// the user's 👍/👎 ratings into per-tag and per-combo like-ratios plus a weekly
// like/dislike trend. Read-only; reloads on focus. Contract lives in @sunoflow/core.
export default function InsightsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [data, setData] = useState<InsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setData(null);
      setError(null);
      fetchInsights()
        .then(setData)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load insights (HTTP ${e.status})` : "Network error");
          console.error("[insights] load failed", e);
        });
    }, []),
  );

  const isEmpty =
    data != null &&
    data.totalLikes === 0 &&
    data.totalDislikes === 0 &&
    data.tagBreakdown.length === 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Insights" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !data ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : isEmpty ? (
        <View style={styles.centered}>
          <BarChart3 color={colors.textFaint} size={40} />
          <Text style={styles.emptyText}>
            No feedback yet. Rate songs 👍/👎 to see what styles land.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <SummaryCard data={data} styles={styles} />
          <TagSection tags={data.tagBreakdown} styles={styles} colors={colors} />
          <ComboSection combos={data.topCombos} styles={styles} colors={colors} />
          <WeeklySection trend={data.weeklyTrend} styles={styles} />
        </ScrollView>
      )}
    </View>
  );
}

function SummaryCard({ data, styles }: { data: InsightsResult; styles: Styles }) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.tile, styles.tileLike]}>
        <Text style={styles.tileLikeNum}>{data.totalLikes}</Text>
        <Text style={styles.dim}>Total Likes</Text>
      </View>
      <View style={[styles.tile, styles.tileDislike]}>
        <Text style={styles.tileDislikeNum}>{data.totalDislikes}</Text>
        <Text style={styles.dim}>Total Dislikes</Text>
      </View>
    </View>
  );
}

function RatioBar({ ratio, styles }: { ratio: number; styles: Styles }) {
  const pct = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` as const;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: pct }]} />
    </View>
  );
}

function TagSection({ tags, styles, colors }: { tags: TagStat[]; styles: Styles; colors: ThemeColors }) {
  if (tags.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Top tags</Text>
      {tags.slice(0, 10).map((t) => (
        <View key={t.tag} style={styles.statRow}>
          <View style={styles.statHead}>
            <Text style={styles.statLabel} numberOfLines={1}>{t.tag}</Text>
            <Text style={styles.counts}>
              <Text style={{ color: colors.successFg }}>{t.likes}↑ </Text>
              <Text style={{ color: colors.danger }}>{t.dislikes}↓</Text>
            </Text>
          </View>
          <RatioBar ratio={t.likeRatio} styles={styles} />
        </View>
      ))}
    </View>
  );
}

function ComboSection({ combos, styles, colors }: { combos: ComboStat[]; styles: Styles; colors: ThemeColors }) {
  if (combos.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Top combos</Text>
      {combos.slice(0, 5).map((c) => (
        <View key={c.combo} style={styles.statRow}>
          <View style={styles.statHead}>
            <Text style={styles.statLabel} numberOfLines={1}>{c.combo}</Text>
            <Text style={styles.counts}>
              <Text style={styles.dim}>{c.total} rated · </Text>
              <Text style={{ color: colors.successFg }}>{Math.round(Math.max(0, Math.min(1, c.likeRatio)) * 100)}%</Text>
            </Text>
          </View>
          <RatioBar ratio={c.likeRatio} styles={styles} />
        </View>
      ))}
    </View>
  );
}

function WeeklySection({ trend, styles }: { trend: WeeklyDataPoint[]; styles: Styles }) {
  const active = trend.filter((w) => w.likes > 0 || w.dislikes > 0);
  if (active.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Weekly trend</Text>
      {active.map((w) => (
        <View key={w.week} style={styles.weekRow}>
          <Text style={styles.weekLabel}>{w.week}</Text>
          <Text style={styles.counts}>
            <Text style={styles.up}>{w.likes}↑ </Text>
            <Text style={styles.down}>{w.dislikes}↓</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
    scroll: { padding: 16, gap: 16, paddingBottom: MINIPLAYER_CLEARANCE },
    emptyText: { color: c.textDim, fontSize: 14, lineHeight: 20, textAlign: "center" },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
    summaryRow: { flexDirection: "row", gap: 12 },
    tile: {
      flex: 1,
      alignItems: "center",
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      paddingVertical: 18,
    },
    tileLike: { backgroundColor: c.successBg, borderColor: c.border },
    tileDislike: { backgroundColor: c.dangerBg, borderColor: c.border },
    tileLikeNum: { color: c.successFg, fontSize: 32, fontWeight: "800", fontVariant: ["tabular-nums"] },
    tileDislikeNum: { color: c.danger, fontSize: 32, fontWeight: "800", fontVariant: ["tabular-nums"] },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 16,
      gap: 12,
    },
    cardTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
    statRow: { gap: 6 },
    statHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    statLabel: { color: c.text, fontSize: 14, fontWeight: "600", flex: 1 },
    counts: { fontSize: 12, fontVariant: ["tabular-nums"] },
    barTrack: { height: 6, borderRadius: 999, backgroundColor: c.surfaceAlt, overflow: "hidden" },
    barFill: { height: 6, borderRadius: 999, backgroundColor: c.successFg },
    weekRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    weekLabel: { color: c.textDim, fontSize: 13, fontVariant: ["tabular-nums"] },
    up: { color: c.successFg },
    down: { color: c.danger },
  });
}
