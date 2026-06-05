import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchRateLimits, type RateLimit } from "@/api/rate-limit";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

type Styles = ReturnType<typeof makeStyles>;

// Read-only mirror of the web settings' rate-limit status. The backend currently
// surfaces a single limit (hourly song generations); fetchRateLimits normalizes
// whatever shape it gets into rows, so this renders 1..N cards uniformly.
// Reloads on focus. Each card: label, "remaining / limit", a used-proportion
// progress bar, and the reset time when known.
export default function RateLimitsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [limits, setLimits] = useState<RateLimit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLimits(null);
      setError(null);
      fetchRateLimits()
        .then(setLimits)
        .catch((e: unknown) => {
          setError(
            e instanceof HttpError
              ? `Couldn't load rate limits (HTTP ${e.status})`
              : "Network error",
          );
          console.error("[rate-limits] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Rate Limits" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !limits ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : limits.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No rate limits to show.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {limits.map((rl) => (
            <LimitCard key={rl.key} limit={rl} styles={styles} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function LimitCard({ limit, styles }: { limit: RateLimit; styles: Styles }) {
  const usedRatio =
    limit.limit > 0 ? Math.max(0, Math.min(1, (limit.limit - limit.remaining) / limit.limit)) : 0;
  const resetLabel = formatResetAt(limit.resetAt);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.label} numberOfLines={1}>{limit.label}</Text>
        <Text style={styles.count}>
          {limit.remaining} / {limit.limit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(usedRatio * 100)}%` }]} />
      </View>
      {resetLabel ? <Text style={styles.reset}>Resets at {resetLabel}</Text> : null}
    </View>
  );
}

function formatResetAt(resetAt: string | null): string | null {
  if (!resetAt) return null;
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString();
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    scroll: { padding: 16, gap: 12 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 16,
      gap: 12,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    label: { flex: 1, color: c.text, fontSize: 16, fontWeight: "700" },
    count: { color: c.text, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.surfaceAlt,
      overflow: "hidden",
    },
    fill: { height: "100%", borderRadius: 3, backgroundColor: c.accent },
    reset: { color: c.textDim, fontSize: 13 },
    dim: { color: c.textDim, fontSize: 13 },
  });
}
