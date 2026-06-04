import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Sparkles, AlertCircle, CheckCircle2, Wand2 } from "lucide-react-native";
import {
  GENERATION_PROMPT_MAX_LENGTH,
  GENERATION_TITLE_MAX_LENGTH,
  GENERATION_STYLE_MAX_LENGTH,
} from "@sunoflow/core";
import {
  startGeneration,
  pollStatus,
  GenerationError,
  type StartedGeneration,
} from "@/api/generate";
import { boostStyle } from "@/api/style-boost";
import { HttpError } from "@/api/client";

// Generate: prompt + key options → POST /api/generate → poll status until the
// song is ready, then route to it. Mirrors the web GenerateForm's style-mode
// (prompt = style description). Four phases: form, submitting, polling, done.
//
// RUNTIME UNTESTED — cannot exercise the RN runtime or the live backend from a
// headless env. Verification path: `expo start`, open Generate, submit a prompt,
// confirm it polls to "ready" and routes to /song/[id].

type Phase = "form" | "submitting" | "polling" | "failed";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75; // backend caps at 60 server-side polls; allow some slack

function paramStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

export default function GenerateScreen() {
  // Prefilled from a persona / template / preset deep-link (router.push params).
  const params = useLocalSearchParams<{ prompt?: string; style?: string; personaId?: string; parentSongId?: string }>();
  const [prompt, setPrompt] = useState(() => paramStr(params.prompt));
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState(() => paramStr(params.style));
  const [instrumental, setInstrumental] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const personaId = paramStr(params.personaId) || undefined;
  const parentSongId = paramStr(params.parentSongId) || undefined;

  const onBoost = useCallback(async () => {
    const content = tags.trim();
    if (!content || boosting) return;
    setBoosting(true);
    setError(null);
    try {
      setTags(await boostStyle(content));
    } catch (e) {
      setError(e instanceof HttpError && e.status === 402 ? "Out of credits for style boost." : "Style boost failed.");
      console.error("[generate] style boost failed", e);
    } finally {
      setBoosting(false);
    }
  }, [tags, boosting]);

  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<StartedGeneration | null>(null);

  // Track mount so the async poll loop can bail after navigation/unmount.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const runPolling = useCallback(async (job: StartedGeneration) => {
    setPhase("polling");
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      if (!aliveRef.current) return;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (!aliveRef.current) return;
      let res;
      try {
        res = await pollStatus(job.songId);
      } catch (e) {
        console.error("[generate] poll failed", e);
        continue; // transient; keep trying within the cap
      }
      if (!aliveRef.current) return;
      if (res.ready) {
        router.replace(`/song/${job.songId}`);
        return;
      }
      if (res.failed) {
        setError(res.errorMessage ?? "Generation failed. Please try again.");
        setPhase("failed");
        return;
      }
    }
    if (!aliveRef.current) return;
    setError("Generation is taking longer than expected. Check your library shortly.");
    setPhase("failed");
  }, []);

  const onSubmit = useCallback(async () => {
    setError(null);
    setPhase("submitting");
    try {
      const job = await startGeneration({
        prompt: prompt.trim(),
        title: title.trim() || undefined,
        tags: tags.trim() || undefined,
        makeInstrumental: instrumental,
        personaId,
        parentSongId,
      });
      setStarted(job);
      await runPolling(job);
    } catch (e) {
      const msg =
        e instanceof GenerationError
          ? e.message
          : "Something went wrong. Please try again.";
      setError(msg);
      setPhase("failed");
    }
  }, [prompt, title, tags, instrumental, personaId, parentSongId, runPolling]);

  const reset = useCallback(() => {
    setError(null);
    setStarted(null);
    setPhase("form");
  }, []);

  const canSubmit = prompt.trim().length > 0 && phase === "form";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Generate" }} />

      {phase === "submitting" || phase === "polling" ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#8b7cff" size="large" />
          <Text style={styles.statusTitle}>
            {phase === "submitting" ? "Starting generation…" : "Composing your song…"}
          </Text>
          <Text style={styles.dim}>
            {phase === "submitting"
              ? "Sending your request"
              : "This usually takes a minute or two. Keep this screen open."}
          </Text>
          {started?.title ? (
            <Text style={styles.dim} numberOfLines={1}>
              {started.title}
            </Text>
          ) : null}
        </View>
      ) : phase === "failed" ? (
        <View style={styles.centered}>
          <AlertCircle color="#ff7a85" size={40} />
          <Text style={styles.statusTitle}>Generation failed</Text>
          <Text style={styles.dim}>{error}</Text>
          <Pressable style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
          {started?.songId ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.replace(`/song/${started.songId}`)}
            >
              <Text style={styles.secondaryBtnText}>View song</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Sparkles color="#8b7cff" size={22} />
              <Text style={styles.heroText}>
                {parentSongId
                  ? "Extending an existing song — describe what to add or change."
                  : "Describe the song you want. Style, mood, genre — anything."}
              </Text>
            </View>

            <Text style={styles.label}>Prompt</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. dreamy lo-fi hip hop with rain sounds and a mellow piano"
              placeholderTextColor="#5a5a62"
              multiline
              maxLength={GENERATION_PROMPT_MAX_LENGTH}
              autoFocus
            />

            <Text style={styles.label}>Title (optional)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Untitled"
              placeholderTextColor="#5a5a62"
              maxLength={GENERATION_TITLE_MAX_LENGTH}
            />

            <Text style={styles.label}>Style / tags (optional)</Text>
            <TextInput
              style={styles.input}
              value={tags}
              onChangeText={setTags}
              placeholder="e.g. lo-fi, chill, instrumental"
              placeholderTextColor="#5a5a62"
              maxLength={GENERATION_STYLE_MAX_LENGTH}
            />
            <Pressable
              style={[styles.boostBtn, (!tags.trim() || boosting) && styles.btnDisabled]}
              disabled={!tags.trim() || boosting}
              onPress={onBoost}
            >
              {boosting ? <ActivityIndicator color="#8b7cff" size="small" /> : <Wand2 color="#8b7cff" size={16} />}
              <Text style={styles.boostText}>{boosting ? "Boosting…" : "Boost style with AI"}</Text>
            </Pressable>

            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text style={styles.switchLabel}>Instrumental</Text>
                <Text style={styles.dim}>No vocals</Text>
              </View>
              <Switch
                value={instrumental}
                onValueChange={setInstrumental}
                trackColor={{ false: "#2a2a32", true: "#7c3aed" }}
                thumbColor="#fff"
              />
            </View>

            {error ? (
              <View style={styles.inlineError}>
                <AlertCircle color="#ff7a85" size={16} />
                <Text style={styles.inlineErrorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
              disabled={!canSubmit}
              onPress={onSubmit}
            >
              <CheckCircle2 color="#fff" size={18} />
              <Text style={styles.primaryBtnText}>Generate</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  formContent: { padding: 20, paddingBottom: 48, gap: 8 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#16131f",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  heroText: { flex: 1, color: "#c8c8d0", fontSize: 13, lineHeight: 18 },
  label: { color: "#9a9aa2", fontSize: 13, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#16161c",
    borderColor: "#26262e",
    borderWidth: 1,
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 4,
  },
  switchLabel: { color: "#fff", fontSize: 15 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.45 },
  boostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#2e2840" },
  boostText: { color: "#8b7cff", fontSize: 14, fontWeight: "600" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { color: "#8b7cff", fontSize: 15, fontWeight: "600" },
  statusTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 6 },
  dim: { color: "#9a9aa2", fontSize: 13, textAlign: "center" },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2a1518",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  inlineErrorText: { flex: 1, color: "#ff9aa3", fontSize: 13 },
});
