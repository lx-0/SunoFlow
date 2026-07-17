import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { goToSection } from "@/navigation";
import { AlertCircle, SlidersHorizontal } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchPresets, deletePreset, type Preset } from "@/api/presets";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/theme";
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

  const load = useCallback(() => {
    setPresets(null);
    setError(null);
    fetchPresets()
      .then(setPresets)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load presets (HTTP ${e.status})` : "Network error");
        console.error("[presets] load failed", e);
      });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openPreset = useCallback((preset: Preset) => {
    // Pass only the params the preset provides; omit empty ones so the Generate
    // screen falls back to its own defaults. No personaId on presets.
    const params: Record<string, string> = {};
    if (preset.lyricsPrompt) params.prompt = preset.lyricsPrompt;
    if (preset.stylePrompt) params.style = preset.stylePrompt;
    if (preset.title) params.title = preset.title;
    if (preset.isInstrumental) params.instrumental = "1";
    goToSection({ pathname: "/generate", params });
  }, []);

  const confirmDelete = useCallback((preset: Preset) => {
    Alert.alert("Delete preset?", `Delete "${preset.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deletePreset(preset.id); load(); }
          catch (e) { Alert.alert("Couldn't delete", "Please try again."); console.error("[presets] delete failed", e); }
        },
      },
    ]);
  }, [load]);

  const rowActions = useCallback((preset: Preset) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: preset.name,
        options: ["Use in Generate", "Delete", "Cancel"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (i) => {
        if (i === 0) openPreset(preset);
        else if (i === 1) confirmDelete(preset);
      },
    );
  }, [openPreset, confirmDelete]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Presets" }} />
      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !presets ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : presets.length === 0 ? (
        <EmptyState
          Icon={SlidersHorizontal}
          title="No presets yet"
          subtitle="Save one from the web app to reuse it here."
        />
      ) : (
        <FlatList
          data={presets}
          contentContainerStyle={styles.listContent}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => rowActions(item)}>
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
    listContent: { paddingBottom: MINIPLAYER_CLEARANCE },
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
    dim: { color: c.textDim, fontSize: 13, fontFamily: fonts.mono, marginTop: 2 },
  });
}
