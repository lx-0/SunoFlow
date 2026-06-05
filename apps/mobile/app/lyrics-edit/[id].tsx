import { useCallback, useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, StyleSheet, Alert,
} from "react-native";
import { Stack, router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchRawLyrics, updateLyrics } from "@/api/lyrics";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Edit a song's lyric TEXT (the `edited` override). Owner-only — reached from the
// owner-scoped song-detail screen. Timestamp/sync editing is a separate timecoded
// editor that is intentionally not ported. Reset reverts to the model's original.
export default function LyricsEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [original, setOriginal] = useState("");
  const [draft, setDraft] = useState("");
  const [hasOverride, setHasOverride] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchRawLyrics(id);
      setOriginal(raw.original);
      setHasOverride(raw.edited !== null);
      setDraft(raw.edited ?? raw.original);
    } catch (e) {
      setError(e instanceof HttpError ? `Couldn't load lyrics (HTTP ${e.status})` : "Network error");
      console.error("[lyrics-edit] load failed", e);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [id]);

  // Load once — don't refetch on re-focus, or it would clobber an in-progress edit.
  useFocusEffect(useCallback(() => {
    if (!loaded) void load();
  }, [loaded, load]));

  async function onSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Empty draft → clear the override (revert to original) rather than saving "".
      const next = draft.trim() === original.trim() || draft.trim() === "" ? null : draft;
      await updateLyrics(id, next);
      setHasOverride(next !== null);
      setSaved(true);
    } catch (e) {
      setError(e instanceof HttpError ? `Couldn't save (HTTP ${e.status})` : "Couldn't save lyrics.");
      console.error("[lyrics-edit] save failed", e);
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    if (!hasOverride && draft === original) return;
    Alert.alert("Revert to original?", "This discards your edited lyrics and restores the original.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revert", style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await updateLyrics(id, null);
            setHasOverride(false);
            setDraft(original);
            setSaved(true);
          } catch (e) {
            setError(e instanceof HttpError ? `Couldn't revert (HTTP ${e.status})` : "Couldn't revert lyrics.");
            console.error("[lyrics-edit] reset failed", e);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: "Edit Lyrics",
          headerRight: () => (
            <Pressable onPress={onSave} disabled={saving || loading} hitSlop={8}>
              {saving ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.saveBtn}>Save</Text>}
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {hasOverride ? <Text style={styles.badge}>Edited — differs from the original</Text> : null}
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(t) => { setDraft(t); setSaved(false); }}
            multiline
            textAlignVertical="top"
            placeholder="Write the lyrics…"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="sentences"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved ? <Text style={styles.saved}>Saved</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.saveFull} onPress={onSave} disabled={saving}>
              <Text style={styles.saveFullText}>Save lyrics</Text>
            </Pressable>
            {hasOverride ? (
              <Pressable style={styles.resetBtn} onPress={onReset} disabled={saving}>
                <Text style={styles.resetText}>Revert to original</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={() => router.back()} style={styles.cancel}>
            <Text style={styles.cancelText}>Done</Text>
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { padding: 16, gap: 14 },
    saveBtn: { color: c.accent, fontSize: 16, fontWeight: "600" },
    badge: { color: c.warnFg, fontSize: 12, fontWeight: "600" },
    input: {
      backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12, color: c.text, fontSize: 15, lineHeight: 22, padding: 14, minHeight: 280,
    },
    error: { color: c.danger, fontSize: 13 },
    saved: { color: c.successFg, fontSize: 13 },
    actions: { gap: 10 },
    saveFull: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    saveFullText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    resetBtn: { borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    resetText: { color: c.danger, fontSize: 15, fontWeight: "600" },
    cancel: { alignItems: "center", paddingVertical: 10 },
    cancelText: { color: c.textDim, fontSize: 15 },
  });
}
