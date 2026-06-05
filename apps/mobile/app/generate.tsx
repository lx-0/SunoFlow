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
  Alert,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Sparkles, AlertCircle, CheckCircle2, Wand2, Star } from "lucide-react-native";
import {
  GENERATION_PROMPT_MAX_LENGTH,
  GENERATION_TITLE_MAX_LENGTH,
  GENERATION_STYLE_MAX_LENGTH,
  MAX_BATCH_SIZE,
} from "@sunoflow/core";
import { startBatch } from "@/api/batch";
import { startGeneration, pollStatus, GenerationError, type StartedGeneration } from "@/api/generate";
import { boostStyle } from "@/api/style-boost";
import { autoFill } from "@/api/generate-auto";
import { generateLyrics } from "@/api/lyrics-generate";
import { fetchPresets, type Preset } from "@/api/presets";
import { fetchStyleTemplates, type StyleTemplate } from "@/api/style-templates";
import { fetchPromptTemplates, type PromptTemplate } from "@/api/prompt-templates";
import { fetchPromptSuggestions, fetchTrendingCombos, type PromptSuggestion, type TrendingCombo } from "@/api/suggestions";
import { fetchPersonas, type Persona } from "@/api/personas";
import { HttpError } from "@/api/client";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Generate — mirrors the web GenerateForm. Style mode: the style/genre IS the
// prompt (Suno auto-writes lyrics). Custom mode: you write (or AI-generate) the
// lyrics, with style as the genre. Presets apply a saved bundle of fields.
// RUNTIME UNTESTED (headless): verify on device — submit, poll to ready, route.

type Phase = "form" | "submitting" | "polling" | "failed";
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75;

function paramStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

export default function GenerateScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ prompt?: string; style?: string; personaId?: string; parentSongId?: string }>();
  const [style, setStyle] = useState(() => paramStr(params.style));
  const [customMode, setCustomMode] = useState(() => Boolean(paramStr(params.prompt) && !paramStr(params.style)));
  const [lyrics, setLyrics] = useState(() => paramStr(params.prompt));
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [count, setCount] = useState(1);
  const [personaId, setPersonaId] = useState<string | undefined>(() => paramStr(params.personaId) || undefined);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>([]);
  const [stStatus, setStStatus] = useState<"loading" | "ready" | "error">("loading");
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [trending, setTrending] = useState<TrendingCombo[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);

  const [boosting, setBoosting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [genningLyrics, setGenningLyrics] = useState(false);

  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<StartedGeneration | null>(null);

  const parentSongId = paramStr(params.parentSongId) || undefined;

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadStyleTemplates = useCallback(() => {
    setStStatus("loading");
    fetchStyleTemplates()
      .then((t) => { setStyleTemplates(t); setStStatus("ready"); })
      .catch((e) => { setStStatus("error"); console.error("[generate] style templates load failed", e); });
  }, []);

  useEffect(() => {
    fetchPresets().then(setPresets).catch((e) => console.error("[generate] presets load failed", e));
    loadStyleTemplates();
    fetchPromptTemplates().then(setPromptTemplates).catch((e) => console.error("[generate] prompt templates load failed", e));
    fetchPersonas().then(setPersonas).catch((e) => console.error("[generate] personas load failed", e));
    fetchPromptSuggestions().then(setSuggestions).catch((e) => console.error("[generate] suggestions load failed", e));
    fetchTrendingCombos().then(setTrending).catch((e) => console.error("[generate] trending load failed", e));
  }, [loadStyleTemplates]);

  function applyPreset(p: Preset) {
    setTitle(p.title ?? "");
    setStyle(p.stylePrompt ?? "");
    setLyrics(p.lyricsPrompt ?? "");
    setInstrumental(p.isInstrumental);
    setCustomMode(p.customMode);
  }

  function applyStyleTemplate(t: StyleTemplate) {
    setStyle(t.tags);
  }

  function applySuggestion(s: PromptSuggestion) {
    setStyle(s.stylePrompt);
    setInstrumental(s.isInstrumental);
  }

  function applyTrending(c: TrendingCombo) {
    setStyle(c.stylePrompt);
  }

  function applyPromptTemplate(t: PromptTemplate) {
    if (t.style) setStyle(t.style);
    setLyrics(t.prompt);
    setCustomMode(true);
  }

  const onBoost = useCallback(async () => {
    const content = style.trim();
    if (!content || boosting) return;
    setBoosting(true);
    setError(null);
    try {
      setStyle(await boostStyle(content));
    } catch (e) {
      setError(e instanceof HttpError && e.status === 402 ? "Out of credits for style boost." : "Style boost failed.");
      console.error("[generate] boost failed", e);
    } finally {
      setBoosting(false);
    }
  }, [style, boosting]);

  const onAutoFill = useCallback(async () => {
    const idea = style.trim() || lyrics.trim();
    if (!idea || autoFilling) return;
    setAutoFilling(true);
    setError(null);
    try {
      const r = await autoFill(idea);
      if (r.title) setTitle(r.title);
      if (r.style) setStyle(r.style);
      if (r.lyricsPrompt) {
        setLyrics(r.lyricsPrompt);
        setCustomMode(true);
      }
    } catch (e) {
      setError(e instanceof HttpError && e.status === 402 ? "Out of credits for auto-fill." : "Auto-fill failed.");
      console.error("[generate] auto-fill failed", e);
    } finally {
      setAutoFilling(false);
    }
  }, [style, lyrics, autoFilling]);

  const onGenLyrics = useCallback(async () => {
    const theme = style.trim() || title.trim();
    if (!theme || genningLyrics) return;
    setGenningLyrics(true);
    setError(null);
    try {
      const text = await generateLyrics(theme);
      if (text) setLyrics(text);
    } catch (e) {
      setError(e instanceof HttpError && e.status === 429 ? "Slow down — too many lyric requests." : "Lyrics generation failed.");
      console.error("[generate] lyrics gen failed", e);
    } finally {
      setGenningLyrics(false);
    }
  }, [style, title, genningLyrics]);

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
        continue;
      }
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
    setError("Generation is taking longer than expected. Check your library shortly.");
    setPhase("failed");
  }, []);

  const onSubmit = useCallback(async () => {
    const submitPrompt = (customMode ? lyrics : style).trim();
    if (!submitPrompt) {
      setError(customMode ? "Write or generate some lyrics first." : "Add a style or genre first.");
      return;
    }
    setError(null);
    setPhase("submitting");

    // Batch: fire N variations of the same config; they surface in the library.
    if (count > 1) {
      const config = {
        prompt: submitPrompt,
        title: title.trim() || undefined,
        tags: style.trim() || undefined,
        makeInstrumental: instrumental,
        personaId,
      };
      try {
        const { count: n } = await startBatch(Array.from({ length: count }, () => config));
        Alert.alert("Generating", `${n} song${n === 1 ? "" : "s"} are being created — they'll appear in your Library.`);
        router.replace("/");
      } catch (e) {
        setError(e instanceof GenerationError ? e.message : "Something went wrong. Please try again.");
        setPhase("failed");
      }
      return;
    }

    try {
      const job = await startGeneration({
        prompt: submitPrompt,
        title: title.trim() || undefined,
        tags: style.trim() || undefined,
        makeInstrumental: instrumental,
        personaId,
        parentSongId,
      });
      setStarted(job);
      await runPolling(job);
    } catch (e) {
      setError(e instanceof GenerationError ? e.message : "Something went wrong. Please try again.");
      setPhase("failed");
    }
  }, [customMode, lyrics, style, title, instrumental, count, personaId, parentSongId, runPolling]);

  const reset = useCallback(() => {
    setError(null);
    setStarted(null);
    setPhase("form");
  }, []);

  const canSubmit = (customMode ? lyrics.trim() : style.trim()).length > 0 && phase === "form";

  if (phase === "submitting" || phase === "polling") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Generate" }} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.statusTitle}>{phase === "submitting" ? "Starting generation…" : "Composing your song…"}</Text>
        <Text style={styles.dim}>This usually takes a minute or two. Keep this screen open.</Text>
        {started?.title ? <Text style={styles.dim} numberOfLines={1}>{started.title}</Text> : null}
      </View>
    );
  }
  if (phase === "failed") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Generate" }} />
        <AlertCircle color={colors.danger} size={40} />
        <Text style={styles.statusTitle}>Generation failed</Text>
        <Text style={styles.dim}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={reset}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
        {started?.songId ? (
          <Pressable style={styles.secondaryBtn} onPress={() => router.replace(`/song/${started.songId}`)}>
            <Text style={styles.secondaryBtnText}>View song</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Generate" }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Sparkles color={colors.accent} size={22} />
            <Text style={styles.heroText}>
              {parentSongId
                ? "Extending an existing song — set the style and (optionally) lyrics."
                : "Set a style/genre. Turn on Custom lyrics to write or generate the words."}
            </Text>
          </View>

          {suggestions.length > 0 ? (
            <>
              <Text style={styles.label}>Suggested for you</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {suggestions.map((s) => (
                  <Pressable
                    key={s.id}
                    style={[styles.presetChip, style === s.stylePrompt && styles.chipActive]}
                    onPress={() => applySuggestion(s)}
                  >
                    {s.source === "personal" ? <Star color={colors.star} size={12} fill={colors.star} /> : null}
                    <Text style={styles.presetText} numberOfLines={1}>{s.label}</Text>
                    {s.isInstrumental ? <Text style={styles.badge}>Instr</Text> : null}
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {trending.length > 0 ? (
            <>
              <Text style={styles.label}>Trending combos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {trending.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[styles.presetChip, style === c.stylePrompt && styles.chipActive]}
                    onPress={() => applyTrending(c)}
                  >
                    <Text style={styles.presetText} numberOfLines={1}>{c.label}</Text>
                    {c.displayScore ? <Text style={styles.badge}>{c.displayScore}</Text> : null}
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {presets.length > 0 ? (
            <>
              <Text style={styles.label}>Presets</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {presets.map((p) => (
                  <Pressable key={p.id} style={styles.presetChip} onPress={() => applyPreset(p)}>
                    <Text style={styles.presetText} numberOfLines={1}>{p.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {promptTemplates.length > 0 ? (
            <>
              <Text style={styles.label}>Prompt templates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {promptTemplates.map((t) => (
                  <Pressable key={t.id} style={styles.presetChip} onPress={() => applyPromptTemplate(t)}>
                    <Text style={styles.presetText} numberOfLines={1}>{t.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {personas.length > 0 ? (
            <>
              <Text style={styles.label}>Voice persona</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                <Pressable
                  style={[styles.presetChip, !personaId && styles.chipActive]}
                  onPress={() => setPersonaId(undefined)}
                >
                  <Text style={[styles.presetText, !personaId && styles.chipActiveText]}>None</Text>
                </Pressable>
                {personas.map((p) => {
                  const pid = p.personaId ?? undefined;
                  const active = !!pid && personaId === pid;
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.presetChip, active && styles.chipActive]}
                      onPress={() => setPersonaId(pid)}
                    >
                      <Text style={[styles.presetText, active && styles.chipActiveText]} numberOfLines={1}>{p.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.label}>Style / genre</Text>
          <TextInput
            style={styles.input}
            value={style}
            onChangeText={setStyle}
            placeholder="e.g. dreamy lo-fi hip hop, mellow piano, rain"
            placeholderTextColor={colors.textFaint}
            maxLength={GENERATION_STYLE_MAX_LENGTH}
          />
          <View style={styles.miniRow}>
            <Pressable style={[styles.miniBtn, (!style.trim() || boosting) && styles.btnDisabled]} disabled={!style.trim() || boosting} onPress={onBoost}>
              {boosting ? <ActivityIndicator color={colors.accent} size="small" /> : <Wand2 color={colors.accent} size={15} />}
              <Text style={styles.miniText}>{boosting ? "Boosting…" : "Boost"}</Text>
            </Pressable>
            <Pressable style={[styles.miniBtn, (!(style.trim() || lyrics.trim()) || autoFilling) && styles.btnDisabled]} disabled={!(style.trim() || lyrics.trim()) || autoFilling} onPress={onAutoFill}>
              {autoFilling ? <ActivityIndicator color={colors.accent} size="small" /> : <Sparkles color={colors.accent} size={15} />}
              <Text style={styles.miniText}>{autoFilling ? "Filling…" : "Auto-fill"}</Text>
            </Pressable>
          </View>

          {/* Style templates fill the Style field — placed right under it (matches
              the web). Always shown, with loading / empty / error(+retry) states. */}
          <Text style={styles.label}>Style templates</Text>
          {stStatus === "loading" ? (
            <Text style={styles.dim}>Loading…</Text>
          ) : stStatus === "error" ? (
            <Pressable onPress={loadStyleTemplates}>
              <Text style={styles.retry}>Couldn&apos;t load style templates — tap to retry</Text>
            </Pressable>
          ) : styleTemplates.length === 0 ? (
            <Text style={styles.dim}>
              No style templates yet. Save one from a song&apos;s menu on the web, then pick it here.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
              {styleTemplates.map((t) => (
                <Pressable
                  key={t.id}
                  style={[styles.presetChip, style === t.tags && styles.chipActive]}
                  onPress={() => applyStyleTemplate(t)}
                >
                  <Text style={[styles.presetText, style === t.tags && styles.chipActiveText]} numberOfLines={1}>{t.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.switchLabel}>Custom lyrics</Text>
              <Text style={styles.dim}>Write or generate the words yourself</Text>
            </View>
            <Switch value={customMode} onValueChange={setCustomMode} trackColor={{ false: colors.surfaceAlt, true: colors.accentStrong }} thumbColor={colors.onAccent} />
          </View>

          {customMode ? (
            <>
              <View style={styles.lyricsHeader}>
                <Text style={styles.label}>Lyrics</Text>
                <Pressable style={[styles.miniBtn, (!(style.trim() || title.trim()) || genningLyrics) && styles.btnDisabled]} disabled={!(style.trim() || title.trim()) || genningLyrics} onPress={onGenLyrics}>
                  {genningLyrics ? <ActivityIndicator color={colors.accent} size="small" /> : <Wand2 color={colors.accent} size={15} />}
                  <Text style={styles.miniText}>{genningLyrics ? "Writing…" : "Generate lyrics"}</Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, styles.lyricsInput]}
                value={lyrics}
                onChangeText={setLyrics}
                placeholder="[Verse]\nYour lyrics here…"
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={GENERATION_PROMPT_MAX_LENGTH}
              />
            </>
          ) : null}

          <Text style={styles.label}>Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Untitled"
            placeholderTextColor={colors.textFaint}
            maxLength={GENERATION_TITLE_MAX_LENGTH}
          />

          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.switchLabel}>Instrumental</Text>
              <Text style={styles.dim}>No vocals</Text>
            </View>
            <Switch value={instrumental} onValueChange={setInstrumental} trackColor={{ false: colors.surfaceAlt, true: colors.accentStrong }} thumbColor={colors.onAccent} />
          </View>

          {!parentSongId ? (
            <>
              <Text style={styles.label}>Variations</Text>
              <View style={styles.countRow}>
                {Array.from({ length: MAX_BATCH_SIZE }, (_, i) => i + 1).map((n) => {
                  const active = count === n;
                  return (
                    <Pressable
                      key={n}
                      style={[styles.countChip, active && styles.chipActive]}
                      onPress={() => setCount(n)}
                    >
                      <Text style={[styles.countText, active && styles.chipActiveText]}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {error ? (
            <View style={styles.inlineError}>
              <AlertCircle color={colors.danger} size={16} />
              <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]} disabled={!canSubmit} onPress={onSubmit}>
            <CheckCircle2 color={colors.onAccent} size={18} />
            <Text style={styles.primaryBtnText}>{count > 1 ? `Generate ${count}` : "Generate"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    formContent: { padding: 20, paddingBottom: 48, gap: 8 },
    hero: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 4 },
    heroText: { flex: 1, color: c.textDim, fontSize: 13, lineHeight: 18 },
    presetRow: { gap: 8, paddingVertical: 8 },
    presetChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.surfaceAlt, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 200 },
    badge: { color: c.onAccent, backgroundColor: c.accent, fontSize: 10, fontWeight: "700", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: "hidden" },
    presetText: { color: c.textDim, fontSize: 13 },
    chipActive: { backgroundColor: c.accentStrong },
    chipActiveText: { color: c.onAccent },
    countRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    countChip: { width: 44, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: c.surfaceAlt },
    countText: { color: c.textDim, fontSize: 15, fontWeight: "600" },
    label: { color: c.textDim, fontSize: 13, marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    lyricsInput: { minHeight: 140, textAlignVertical: "top" },
    lyricsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
    miniRow: { flexDirection: "row", gap: 10, marginTop: 8 },
    miniBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    miniText: { color: c.accent, fontSize: 13, fontWeight: "600" },
    switchRow: { flexDirection: "row", alignItems: "center", marginTop: 18, paddingVertical: 4 },
    switchLabel: { color: c.text, fontSize: 15 },
    primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 15, marginTop: 24 },
    btnDisabled: { opacity: 0.45 },
    primaryBtnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    secondaryBtn: { paddingVertical: 12 },
    secondaryBtnText: { color: c.accent, fontSize: 15, fontWeight: "600" },
    statusTitle: { color: c.text, fontSize: 18, fontWeight: "700", marginTop: 6 },
    dim: { color: c.textDim, fontSize: 13 },
    retry: { color: c.accent, fontSize: 13, fontWeight: "600" },
    inlineError: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surfaceAlt, borderRadius: 10, padding: 12, marginTop: 16 },
    inlineErrorText: { flex: 1, color: c.danger, fontSize: 13 },
  });
}
