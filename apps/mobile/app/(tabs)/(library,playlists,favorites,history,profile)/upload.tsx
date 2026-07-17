import { useCallback, useState } from "react";
import { View, Pressable, ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView } from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { Stack } from "expo-router";
import { Upload, AlertCircle } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { startUpload } from "@/api/upload";
import { GenerationError } from "@/api/generate";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import { useHeaderOffset } from "@/hooks/useHeaderOffset";
import { usePollingJob } from "@/hooks/usePollingJob";
import { fonts, radii } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";

// Cover / extend from your own audio — pick a file (base64) or paste a URL.
// The polling + poll-failed legs live in usePollingJob; the screen phase covers
// the submit step (and submit failures) only — render on the union of both.
type Phase = "form" | "submitting" | "failed";

export default function UploadScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const headerOffset = useHeaderOffset();
  const [mode, setMode] = useState<"cover" | "extend">("cover");
  const [fileName, setFileName] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitPhase, setSubmitPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  const poll = usePollingJob({ logTag: "upload" });

  const pickFile = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const data = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      setBase64(data);
      setFileName(asset.name ?? "audio");
      setFileUrl(""); // base64 + url are mutually exclusive
    } catch (e) {
      setError("Couldn't read that file.");
      console.error("[upload] pick failed", e);
    }
  }, []);

  async function onSubmit() {
    if (!base64 && !fileUrl.trim()) return;
    setError(null);
    setSubmitPhase("submitting");
    try {
      const job = await startUpload({
        mode,
        title: title.trim() || undefined,
        ...(base64 ? { base64Data: base64 } : { fileUrl: fileUrl.trim() }),
      });
      await poll.start(job, {
        hrefFor: (j) => `/song/${j.songId}`,
        messages: {
          failed: "Upload generation failed.",
          timeout: "Taking longer than expected. Check your library shortly.",
        },
      });
    } catch (e) {
      setError(e instanceof GenerationError ? e.message : "Something went wrong. Please try again.");
      setSubmitPhase("failed");
    }
  }

  const phase = poll.phase === "idle" ? submitPhase : poll.phase;

  if (phase === "submitting" || phase === "polling") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Upload" }} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.statusTitle}>{phase === "submitting" ? "Uploading…" : `Creating your ${mode}…`}</Text>
        <Text style={styles.dim}>This usually takes a minute or two. Keep this screen open.</Text>
      </View>
    );
  }
  if (phase === "failed") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Upload" }} />
        <AlertCircle color={colors.danger} size={40} />
        <Text style={styles.statusTitle}>Upload failed</Text>
        <Text style={styles.dim}>{poll.error ?? error}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => { setError(null); setSubmitPhase("form"); poll.reset(); }} accessibilityRole="button">
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const canSubmit = !!base64 || fileUrl.trim().length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={headerOffset}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Upload" }} />

      <View style={styles.segment}>
        {(["cover", "extend"] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.segmentItem, mode === m && styles.segmentActive]}
            onPress={() => setMode(m)}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
            hitSlop={{ top: 4, bottom: 4 }}
          >
            <Text style={[styles.segmentText, mode === m && styles.segmentActiveText]}>{m === "cover" ? "Cover" : "Extend"}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.dim}>
        {mode === "cover" ? "Re-sing your audio in a new style." : "Continue your audio into a longer track."}
      </Text>

      <Pressable style={styles.pickBtn} onPress={pickFile} accessibilityRole="button">
        <Upload color={colors.accent} size={18} />
        <Text style={styles.pickText} numberOfLines={1}>{fileName ?? "Pick an audio file"}</Text>
      </Pressable>

      <Text style={styles.orLabel}>or paste a file URL</Text>
      <TextInput
        style={styles.input}
        value={fileUrl}
        onChangeText={(t) => { setFileUrl(t); if (t) { setBase64(null); setFileName(null); } }}
        placeholder="https://…/audio.mp3"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Title (optional)</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Untitled" placeholderTextColor={colors.textFaint} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]} disabled={!canSubmit} onPress={onSubmit} accessibilityRole="button">
        <Text style={styles.primaryBtnText}>{mode === "cover" ? "Create cover" : "Extend"}</Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, gap: 10, paddingBottom: MINIPLAYER_CLEARANCE },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: c.bg },
    segment: { flexDirection: "row", backgroundColor: c.surface, borderRadius: radii.lg, padding: 4, gap: 4 },
    segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radii.md },
    segmentActive: { backgroundColor: c.accentStrong },
    segmentText: { color: c.textDim, fontSize: 14, fontWeight: "600" },
    segmentActiveText: { color: c.onAccent },
    pickBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 14, marginTop: 6 },
    pickText: { color: c.text, fontSize: 15, flex: 1 },
    orLabel: { color: c.textFaint, fontSize: 12, textAlign: "center", marginTop: 6 },
    label: { color: c.textDim, fontSize: 13, marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, color: c.text, fontSize: 15, fontFamily: fonts.mono, paddingHorizontal: 14, paddingVertical: 12 },
    errorText: { color: c.danger, fontSize: 13, marginTop: 8 },
    primaryBtn: { backgroundColor: c.accentStrong, borderRadius: radii.lg, paddingVertical: 14, alignItems: "center", marginTop: 20 },
    btnDisabled: { opacity: 0.45 },
    primaryBtnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    statusTitle: { color: c.text, fontSize: 18, fontWeight: "700", marginTop: 6 },
    dim: { color: c.textDim, fontSize: 13, textAlign: "center" },
  });
}
