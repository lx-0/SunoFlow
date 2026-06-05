import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { Upload, AlertCircle } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { startUpload } from "@/api/upload";
import { pollStatus, GenerationError } from "@/api/generate";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Cover / extend from your own audio — pick a file (base64) or paste a URL.
type Phase = "form" | "submitting" | "polling" | "failed";
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75;

export default function UploadScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [mode, setMode] = useState<"cover" | "extend">("cover");
  const [fileName, setFileName] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  const aliveRef = useRef(true);

  // Stop the poll loop from touching state / navigating after unmount (the user
  // can leave mid-poll). Matches generate.tsx / mashup.tsx.
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

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
    setPhase("submitting");
    try {
      const job = await startUpload({
        mode,
        title: title.trim() || undefined,
        ...(base64 ? { base64Data: base64 } : { fileUrl: fileUrl.trim() }),
      });
      setPhase("polling");
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        if (!aliveRef.current) return;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        let res;
        try {
          res = await pollStatus(job.songId);
        } catch (e) {
          console.error("[upload] poll failed", e);
          continue;
        }
        if (res.ready) {
          router.replace(`/song/${job.songId}`);
          return;
        }
        if (res.failed) {
          setError(res.errorMessage ?? "Upload generation failed.");
          setPhase("failed");
          return;
        }
      }
      setError("Taking longer than expected. Check your library shortly.");
      setPhase("failed");
    } catch (e) {
      setError(e instanceof GenerationError ? e.message : "Something went wrong. Please try again.");
      setPhase("failed");
    }
  }

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
        <Text style={styles.dim}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => { setError(null); setPhase("form"); }}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const canSubmit = !!base64 || fileUrl.trim().length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Upload" }} />

      <View style={styles.segment}>
        {(["cover", "extend"] as const).map((m) => (
          <Pressable key={m} style={[styles.segmentItem, mode === m && styles.segmentActive]} onPress={() => setMode(m)}>
            <Text style={[styles.segmentText, mode === m && styles.segmentActiveText]}>{m === "cover" ? "Cover" : "Extend"}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.dim}>
        {mode === "cover" ? "Re-sing your audio in a new style." : "Continue your audio into a longer track."}
      </Text>

      <Pressable style={styles.pickBtn} onPress={pickFile}>
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

      <Pressable style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]} disabled={!canSubmit} onPress={onSubmit}>
        <Text style={styles.primaryBtnText}>{mode === "cover" ? "Create cover" : "Extend"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, gap: 10, paddingBottom: 48 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: c.bg },
    segment: { flexDirection: "row", backgroundColor: c.surface, borderRadius: 12, padding: 4, gap: 4 },
    segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
    segmentActive: { backgroundColor: c.accentStrong },
    segmentText: { color: c.textDim, fontSize: 14, fontWeight: "600" },
    segmentActiveText: { color: c.onAccent },
    pickBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, marginTop: 6 },
    pickText: { color: c.text, fontSize: 15, flex: 1 },
    orLabel: { color: c.textFaint, fontSize: 12, textAlign: "center", marginTop: 6 },
    label: { color: c.textDim, fontSize: 13, marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    errorText: { color: c.danger, fontSize: 13, marginTop: 8 },
    primaryBtn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 20 },
    btnDisabled: { opacity: 0.45 },
    primaryBtnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    statusTitle: { color: c.text, fontSize: 18, fontWeight: "700", marginTop: 6 },
    dim: { color: c.textDim, fontSize: 13, textAlign: "center" },
  });
}
