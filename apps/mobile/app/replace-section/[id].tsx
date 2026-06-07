import { useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, StyleSheet, Alert,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { HttpError } from "@/api/client";
import { replaceSection } from "@/api/song-studio";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";

// Replace (infill) a time section of a song with a freshly-generated part. The
// server needs a prompt + the [start, end] window in seconds. Fires a new async
// generation; the result appears as a new version when ready.
export default function ReplaceSectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [prompt, setPrompt] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startN = Number(start);
  const endN = Number(end);
  const validWindow = Number.isFinite(startN) && Number.isFinite(endN) && startN >= 0 && endN > startN;
  const canSubmit = !!id && prompt.trim().length > 0 && validWindow && !busy;

  async function submit() {
    if (!canSubmit || !id) return;
    setBusy(true);
    setError(null);
    try {
      await replaceSection(id, {
        prompt,
        infillStartS: startN,
        infillEndS: endN,
        tags: tags.trim() || undefined,
      });
      Alert.alert("Section replacement started", "The regenerated version will appear under Versions when ready.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(e instanceof HttpError && e.message ? e.message : "Couldn't start the replacement. Please try again.");
      console.error("[replace-section] failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: "Replace Section" }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.help}>
          Regenerate part of the song. Give the new part a prompt and the time window (in seconds) to replace.
        </Text>

        <Text style={styles.label}>New part: prompt</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="What the replaced section should be"
          placeholderTextColor={colors.textFaint}
          multiline
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Start (s)</Text>
            <TextInput style={styles.input} value={start} onChangeText={setStart} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textFaint} />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>End (s)</Text>
            <TextInput style={styles.input} value={end} onChangeText={setEnd} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.textFaint} />
          </View>
        </View>
        {start.length > 0 && end.length > 0 && !validWindow ? (
          <Text style={styles.error}>End must be greater than start.</Text>
        ) : null}

        <Text style={styles.label}>Style, tags (optional)</Text>
        <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="e.g. guitar solo" placeholderTextColor={colors.textFaint} autoCapitalize="none" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.btn, !canSubmit && styles.btnDisabled]} disabled={!canSubmit} onPress={submit}>
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Replace section</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, gap: 8, paddingBottom: MINIPLAYER_CLEARANCE },
    help: { color: c.textDim, fontSize: 14, lineHeight: 20, marginBottom: 6 },
    label: { color: c.textDim, fontSize: 13, marginTop: 8 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.mono },
    multiline: { minHeight: 80, textAlignVertical: "top" },
    row: { flexDirection: "row", gap: 12 },
    half: { flex: 1 },
    error: { color: c.danger, fontSize: 13, marginTop: 8 },
    btn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20 },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
  });
}
