import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useFocusEffect, type Href } from "expo-router";
import { goToSection } from "@/navigation";
import { Sparkles, RefreshCw } from "lucide-react-native";
import type { DigestItem, InspirationDigest } from "@sunoflow/core";
import { HttpError } from "@/api/client";
import { fetchTodaysPicks, generateTodaysPicks } from "@/api/digests";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Inspire → "Today's Picks": auto-curated RSS-derived prompt ideas (digest items).
// Each card hands the Generate screen the FULL link-followed article as the
// lyrics-generation basis (same contract as the web app). Digest logic lives in
// @sunoflow/core.
// Mirror of the web BASIS_MAX — stays under the /api/lyrics/generate 6000 cap.
const LYRICS_BASIS_MAX = 5800;

export default function InspireScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [picks, setPicks] = useState<InspirationDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPicks(await fetchTodaysPicks(new Date()));
    } catch (e) {
      setError(e instanceof HttpError ? `Couldn't load picks (HTTP ${e.status})` : "Network error");
      console.error("[inspire] load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const digest = await generateTodaysPicks();
      setPicks(digest);
      if (!digest) setError("Couldn't generate picks. Add RSS feeds first (Manage RSS feeds below).");
    } catch (e) {
      setError(
        e instanceof HttpError && (e.status === 422 || e.status === 400)
          ? "No RSS feeds configured. Tap \"Manage RSS feeds\" below to add one."
          : "Couldn't generate today's picks. Please try again.",
      );
      console.error("[inspire] generate failed", e);
    } finally {
      setGenerating(false);
    }
  }

  function generateFrom(item: DigestItem) {
    // Prefer the full link-followed article as the lyrics-generation basis (same
    // contract as the web app's Inspire → /generate?lyricsprompt=…). suggestedPrompt
    // is only a one-line label; fall back to it when no article body is present.
    const article = (item.content ?? "").replace(/\s+/g, " ").trim();
    if (article) {
      // Hand over ONLY the article. The Generate screen runs it through the LLM,
      // which produces the title, the music style AND the full lyrics — each into
      // its own field. (The heuristic mood/topics are too noisy to use as style.)
      const basis = [item.title, article].filter(Boolean).join("\n\n").slice(0, LYRICS_BASIS_MAX);
      goToSection({ pathname: "/generate", params: { lyricsprompt: basis } } as Href);
      return;
    }
    goToSection({ pathname: "/generate", params: { prompt: item.suggestedPrompt } } as Href);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Inspire",
          headerRight: () =>
            picks ? (
              <Pressable onPress={generate} disabled={generating} hitSlop={8}>
                <RefreshCw color={colors.accent} size={20} />
              </Pressable>
            ) : null,
        }}
      />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : !picks ? (
        <View style={styles.centered}>
          <Sparkles color={colors.textFaint} size={40} />
          <Text style={styles.emptyText}>
            Auto-curate today&apos;s top inspiration from your RSS feeds: diverse moods and sources.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.cta, generating && styles.ctaDisabled]} onPress={generate} disabled={generating}>
            {generating ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.ctaText}>Generate Today&apos;s Picks</Text>
            )}
          </Pressable>
          <Pressable onPress={() => goToSection("/rss-feeds" as Href)}>
            <Text style={styles.manageLink}>Manage RSS feeds</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={picks.items}
          keyExtractor={(item, i) => `${item.feedTitle ?? "x"}-${i}`}
          contentContainerStyle={{ padding: 16, paddingBottom: MINIPLAYER_CLEARANCE }}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.headerTitle}>{picks.title}</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.feedTitle ? <Text style={styles.feed}>{item.feedTitle}</Text> : null}
              <Text style={styles.cardTitle}>{item.title}</Text>

              <View style={styles.chips}>
                {item.mood && item.mood !== "neutral" ? (
                  <View style={styles.moodChip}>
                    <Text style={styles.moodText}>{item.mood}</Text>
                  </View>
                ) : null}
                {item.topics.map((t) => (
                  <View key={t} style={styles.topicChip}>
                    <Text style={styles.topicText}>{t}</Text>
                  </View>
                ))}
              </View>

              {item.content && item.content.trim().length > 0 ? (
                <Text style={styles.suggested} numberOfLines={4}>
                  {item.content.replace(/\s+/g, " ").trim().slice(0, 200)}…
                </Text>
              ) : (
                <Text style={styles.suggested}>♪ {item.suggestedPrompt}</Text>
              )}

              <Pressable style={styles.genBtn} onPress={() => generateFrom(item)}>
                <Sparkles color={colors.accent} size={16} />
                <Text style={styles.genText}>Generate from this</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
    emptyText: { color: c.textDim, fontSize: 14, lineHeight: 20, textAlign: "center" },
    error: { color: c.danger, fontSize: 13, textAlign: "center" },
    manageLink: { color: c.accent, fontSize: 14, fontWeight: "600" },
    cta: { backgroundColor: c.accentStrong, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    listHeader: { marginBottom: 12, gap: 8 },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: "700" },
    card: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16 },
    feed: { color: c.accent, fontSize: 11, fontWeight: "600", marginBottom: 4 },
    cardTitle: { color: c.text, fontSize: 15, fontWeight: "600", lineHeight: 20 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
    moodChip: { backgroundColor: c.accentStrong, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    moodText: { color: c.onAccent, fontSize: 11, fontWeight: "700" },
    topicChip: { backgroundColor: c.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    topicText: { color: c.textDim, fontSize: 11 },
    suggested: { color: c.textDim, fontSize: 13, lineHeight: 19, marginTop: 12 },
    genBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
    genText: { color: c.accent, fontSize: 14, fontWeight: "600" },
  });
}
