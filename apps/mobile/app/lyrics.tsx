import { useEffect, useRef, useState } from "react";
import { View, ScrollView, ActivityIndicator, StyleSheet, type LayoutChangeEvent } from "react-native";
import { Text } from "@/components/Themed";
import { Stack } from "expo-router";
import { FileText } from "lucide-react-native";
import { usePlayback } from "@/playback/usePlayback";
import { fetchLyrics, type LyricLine } from "@/api/lyrics";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";

// Lyrics view. Loads the current song's lyrics (+ optional line timestamps). When
// timestamps exist, the active line is highlighted and auto-scrolled to follow
// playback; without timestamps it's a static, scrollable lyric sheet.
export default function LyricsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { current, positionSeconds } = usePlayback();
  const reduceMotion = useReducedMotion();
  const songId = current?.id;
  const [lines, setLines] = useState<LyricLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);

  useEffect(() => {
    setLines(null);
    setError(null);
    offsets.current = [];
    if (!songId) return;
    let cancelled = false;
    fetchLyrics(songId)
      .then((l) => {
        if (!cancelled) setLines(l);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError("Couldn't load lyrics");
        console.error("[lyrics] load failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  const hasTimestamps = !!lines?.some((l) => l.time !== null);
  // Active line = last timestamped line whose start is at/under the playhead.
  let activeLine = -1;
  if (hasTimestamps && lines) {
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].time;
      if (t !== null && t <= positionSeconds) activeLine = i;
    }
  }

  // Follow the active line.
  useEffect(() => {
    if (activeLine < 0) return;
    const y = offsets.current[activeLine];
    if (typeof y === "number") {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 140), animated: !reduceMotion });
    }
  }, [activeLine, reduceMotion]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: current?.title ?? "Lyrics" }} />
      {error ? (
        <EmptyState Icon={FileText} title={error} tone="error" />
      ) : !lines ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : lines.length === 0 ? (
        <EmptyState Icon={FileText} title="No lyrics for this song." />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            {lines.map((line, i) => (
              <Text
                key={i}
                onLayout={(e: LayoutChangeEvent) => {
                  offsets.current[i] = e.nativeEvent.layout.y;
                }}
                style={[
                  styles.line,
                  line.text.trim() === "" && styles.blank,
                  hasTimestamps && (i === activeLine ? styles.active : styles.inactive),
                ]}
              >
                {line.text || " "}
              </Text>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    content: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: MINIPLAYER_CLEARANCE },
    card: { backgroundColor: c.surface, borderRadius: radii.xl, padding: 16 },
    line: { color: c.text, fontSize: 18, lineHeight: 28, marginVertical: 2, fontFamily: fonts.mono },
    blank: { height: 14 },
    active: { color: c.text, fontFamily: fonts.monoSemibold },
    inactive: { color: c.textFaint },
  });
}
