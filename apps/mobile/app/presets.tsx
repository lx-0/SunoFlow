import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { SlidersHorizontal } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchPresets, type Preset } from "@/api/presets";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Presets: the user's saved generation-param bundles. Reloads on focus so
// presets created/deleted on the web app appear. Tap a row to open the Generate
// screen prefilled from the preset (lyrics -> prompt, style -> style, plus the
// title + instrumental flag). The Generate screen reads these params separately.
export default function PresetsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPresets(null);
      setError(null);
      fetchPresets()
        .then(setPresets)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load presets (HTTP ${e.status})` : "Network error");
          console.error("[presets] load failed", e);
        });
    }, []),
  );

  const openPreset = useCallback((preset: Preset) => {
    // Pass only the params the preset provides; omit empty ones so the Generate
    // screen falls back to its own defaults. No personaId on presets.
    const params: Record<string, string> = {};
    if (preset.lyricsPrompt) params.prompt = preset.lyricsPrompt;
    if (preset.stylePrompt) params.style = preset.stylePrompt;
    if (preset.title) params.title = preset.title;
    if (preset.isInstrumental) params.instrumental = "1";
    router.push({ pathname: "/generate", params });
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Presets" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !presets ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : presets.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>No presets yet. Save one from the web app to reuse it here.</Text>
        </View>
      ) : (
        <FlatList
          data={presets}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openPreset(item)}>
              <View style={styles.icon}>
                <SlidersHorizontal color={colors.accent} size={18} />
              </View>
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.dim} numberOfLines={1}>{subtitle(item)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function subtitle(p: Preset): string {
  const parts: string[] = [];
  if (p.stylePrompt) parts.push(p.stylePrompt);
  else if (p.lyricsPrompt) parts.push(p.lyricsPrompt);
  if (p.isInstrumental) parts.push("Instrumental");
  return parts.length > 0 ? parts.join(" · ") : "Empty preset";
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
    icon: { width: 36, alignItems: "flex-start", justifyContent: "center" },
    meta: { flex: 1 },
    title: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
