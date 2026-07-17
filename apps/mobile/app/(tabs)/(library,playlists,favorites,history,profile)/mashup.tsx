import { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, Switch, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { Stack, router, useFocusEffect, useNavigation, type Href } from "expo-router";
import { Check, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchLibrary } from "@/api/songs";
import { startMashup } from "@/api/mashup";
import { pollStatus, GenerationError } from "@/api/generate";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Mashup: pick two songs from the library → POST /api/mashup → poll until ready.
type Phase = "form" | "submitting" | "polling" | "failed";
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75;

export default function MashupScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]); // ordered: [A, B]
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Defer the completion redirect until this screen is focused again: under the
  // Tabs model a blind router.replace would replace the root of whatever tab the
  // user switched to while polling. Focus is read imperatively at completion
  // time (navigation.isFocused()): with freezeOnBlur on the Tabs, a frozen
  // screen's useIsFocused hook value would stay stale until unfreeze.
  const navigation = useNavigation();
  const pendingHrefRef = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const href = pendingHrefRef.current;
      if (href) {
        pendingHrefRef.current = null;
        router.replace(href as Href);
      }
    }, []),
  );

  const loadSongs = useCallback(() => {
    let cancelled = false;
    setError(null);
    setSongs(null);
    fetchLibrary()
      .then((s) => !cancelled && setSongs(s))
      .catch((e) => {
        if (!cancelled) setError(e instanceof HttpError ? `Failed to load songs (HTTP ${e.status})` : "Network error");
        console.error("[mashup] load failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Focus load and Retry share one cancel slot: whichever load runs next first
  // cancels the previous in-flight one, and the focus cleanup cancels on blur —
  // so an uncancelled retry can't write state or a spurious late error.
  const cancelRef = useRef<(() => void) | undefined>(undefined);
  const runLoad = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = loadSongs();
  }, [loadSongs]);

  useFocusEffect(
    useCallback(() => {
      runLoad();
      return () => cancelRef.current?.();
    }, [runLoad]),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev; // cap at two
      return [...prev, id];
    });
  }

  const titleFor = (id: string) => songs?.find((s) => s.id === id)?.title ?? "Track";

  async function onSubmit() {
    if (selected.length !== 2) return;
    setError(null);
    setPhase("submitting");
    try {
      const job = await startMashup({
        trackAId: selected[0],
        trackBId: selected[1],
        title: title.trim() || undefined,
        style: style.trim() || undefined,
        instrumental,
      });
      setPhase("polling");
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        if (!aliveRef.current) return;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (!aliveRef.current) return;
        let res;
        try {
          res = await pollStatus(job.songId);
        } catch (e) {
          console.error("[mashup] poll failed", e);
          continue;
        }
        if (res.ready) {
          if (!navigation.isFocused()) {
            pendingHrefRef.current = `/song/${job.songId}`;
            return;
          }
          router.replace(`/song/${job.songId}`);
          return;
        }
        if (res.failed) {
          setError(res.errorMessage ?? "Mashup failed. Please try again.");
          setPhase("failed");
          return;
        }
      }
      setError("Mashup is taking longer than expected. Check your library shortly.");
      setPhase("failed");
    } catch (e) {
      setError(e instanceof GenerationError ? e.message : "Something went wrong. Please try again.");
      setPhase("failed");
    }
  }

  if (phase === "submitting" || phase === "polling") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Mashup" }} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.statusTitle}>
          {phase === "submitting" ? "Starting mashup…" : "Blending your tracks…"}
        </Text>
        <Text style={styles.dim}>This usually takes a minute or two. Keep this screen open.</Text>
      </View>
    );
  }
  if (phase === "failed") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Mashup" }} />
        <AlertCircle color={colors.danger} size={40} />
        <Text style={styles.statusTitle}>Mashup failed</Text>
        <Text style={styles.dim}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => { setError(null); setPhase("form"); }}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (error && songs === null) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Mashup" }} />
        <EmptyState
          tone="error"
          Icon={AlertCircle}
          title="Couldn't load songs"
          subtitle={error}
          ctaLabel="Retry"
          onCta={runLoad}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Mashup" }} />
      <FlatList
        data={songs ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.dim}>Pick two songs to blend into a new track.</Text>
            <Text style={styles.slot}>{selected[0] ? `A · ${titleFor(selected[0])}` : "A · tap a song"}</Text>
            <Text style={styles.slot}>{selected[1] ? `B · ${titleFor(selected[1])}` : "B · tap a song"}</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title (optional)" placeholderTextColor={colors.textFaint} />
            <TextInput style={styles.input} value={style} onChangeText={setStyle} placeholder="Style / tags (optional)" placeholderTextColor={colors.textFaint} />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Instrumental</Text>
              <Switch value={instrumental} onValueChange={setInstrumental} trackColor={{ false: colors.surfaceAlt, true: colors.accentStrong }} thumbColor={colors.onAccent} />
            </View>
            <Pressable style={[styles.primaryBtn, selected.length !== 2 && styles.btnDisabled]} disabled={selected.length !== 2} onPress={onSubmit}>
              <Text style={styles.primaryBtnText}>Create Mashup</Text>
            </Pressable>
            <Text style={[styles.dim, styles.listLabel]}>Your songs</Text>
          </View>
        }
        ListEmptyComponent={
          songs === null
            ? <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
            : <View style={styles.centered}><Text style={styles.dim}>No songs to mash up yet.</Text></View>
        }
        renderItem={({ item }) => (
          <SongRow
            song={item}
            onPress={() => toggle(item.id)}
            right={selected.includes(item.id) ? <Check color={colors.accent} size={20} /> : null}
          />
        )}
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: c.bg },
    listContent: { paddingBottom: 96 },
    header: { padding: 16, gap: 10 },
    slot: { color: c.text, fontSize: 15, backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, fontFamily: fonts.mono, paddingHorizontal: 14, paddingVertical: 12 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
    switchLabel: { color: c.text, fontSize: 15 },
    primaryBtn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
    btnDisabled: { opacity: 0.45 },
    primaryBtnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    statusTitle: { color: c.text, fontSize: 18, fontWeight: "700", marginTop: 6 },
    dim: { color: c.textDim, fontSize: 13, textAlign: "center" },
    listLabel: { textAlign: "left", marginTop: 10, fontWeight: "600" },
  });
}
