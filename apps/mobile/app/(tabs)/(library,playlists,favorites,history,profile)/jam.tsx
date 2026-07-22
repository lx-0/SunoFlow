import { useCallback, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { Stack, useFocusEffect, type Href } from "expo-router";
import { PartyPopper, Plus } from "lucide-react-native";
import { pushInActiveTab } from "@/navigation";
import { HttpError } from "@/api/client";
import { Chip } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii, spacing } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";
import {
  createJamSession,
  fetchJamSessions,
  type JamSessionSummary,
} from "@/api/jam";

const DURATIONS = [4, 12, 24, 48] as const;

// Host surface for Party Mode: list existing jam sessions and open new ones.
// STUDIO-gated SERVER-side (the app does not know the subscription tier);
// non-studio users get the server's 403 message surfaced inline.
export default function JamScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [sessions, setSessions] = useState<JamSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [budget, setBudget] = useState("30");
  const [duration, setDuration] = useState<number>(24);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await fetchJamSessions());
      setError(null);
    } catch (e) {
      setError(e instanceof HttpError ? e.message : "Couldn't load jam sessions");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleCreate() {
    if (creating) return;
    const budgetTotal = Number(budget);
    if (!Number.isInteger(budgetTotal) || budgetTotal < 1 || budgetTotal > 100) {
      setCreateError("Budget must be between 1 and 100 songs");
      return;
    }
    const cleanSlug = slug.trim().toLowerCase();
    if (cleanSlug && !/^[a-z0-9-]{4,40}$/.test(cleanSlug)) {
      setCreateError("Link name: 4-40 characters, letters/digits/hyphens");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const session = await createJamSession({
        name: name.trim() || undefined,
        slug: cleanSlug || undefined,
        budgetTotal,
        durationHours: duration,
      });
      if (session) {
        setShowCreate(false);
        setName("");
        setSlug("");
        pushInActiveTab(`/jam-session/${session.id}` as Href);
      }
    } catch (e) {
      setCreateError(
        e instanceof HttpError ? e.message : "Couldn't start the jam session",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Jam Sessions" }} />
      <FlatList
        data={sessions ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              style={styles.createBtn}
              onPress={() => setShowCreate((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Start jam session"
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.createBtnText}>Start jam session</Text>
            </Pressable>
            {showCreate && (
              <View style={styles.form}>
                <Text style={styles.formHint}>
                  Guests join via QR without an account and push song prompts
                  straight into the party queue. Generations run on your
                  credits — the budget caps them.
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Session name (optional)"
                  placeholderTextColor={colors.textFaint}
                  maxLength={80}
                  style={styles.input}
                />
                <TextInput
                  value={slug}
                  onChangeText={setSlug}
                  placeholder="Link name (optional) — /jam/…"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={40}
                  style={styles.input}
                />
                <View style={styles.row}>
                  <Text style={styles.label}>Budget</Text>
                  <TextInput
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="number-pad"
                    maxLength={3}
                    accessibilityLabel="Song budget"
                    style={[styles.input, styles.budgetInput]}
                  />
                  <Text style={styles.label}>songs</Text>
                </View>
                <View style={styles.row}>
                  {DURATIONS.map((h) => (
                    <Chip
                      key={h}
                      label={`${h}h`}
                      active={duration === h}
                      onPress={() => setDuration(h)}
                    />
                  ))}
                </View>
                {createError && (
                  <Text style={styles.error} accessibilityRole="alert">
                    {createError}
                  </Text>
                )}
                <Pressable
                  style={[styles.createBtn, creating && styles.disabled]}
                  onPress={handleCreate}
                  disabled={creating}
                  accessibilityRole="button"
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <PartyPopper size={18} color="#fff" />
                  )}
                  <Text style={styles.createBtnText}>
                    {creating ? "Starting…" : "Open the party"}
                  </Text>
                </Pressable>
              </View>
            )}
            {error && (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          sessions === null ? (
            <ActivityIndicator style={styles.loading} color={colors.textDim} />
          ) : (
            <EmptyState
              Icon={PartyPopper}
              title="No jam sessions yet — start one and put the QR on a screen."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.rowCard}
            onPress={() => pushInActiveTab(`/jam-session/${item.id}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={`Open jam session ${item.name}`}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {item.status === "open" ? "Live" : "Ended"} ·{" "}
                {item.budgetUsed}/{item.budgetTotal} songs · /jam/{item.shareToken}
              </Text>
            </View>
            {item.status === "open" && <View style={styles.liveDot} />}
          </Pressable>
        )}
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.md, paddingBottom: MINIPLAYER_CLEARANCE, gap: spacing.sm },
    header: { gap: spacing.sm, marginBottom: spacing.sm },
    createBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      backgroundColor: c.accent,
      borderRadius: radii.lg,
      paddingVertical: 12,
    },
    createBtnText: { color: "#fff", fontFamily: fonts.sansSemibold, fontSize: 15 },
    form: {
      backgroundColor: c.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      gap: spacing.sm,
    },
    formHint: { color: c.textDim, fontSize: 12, lineHeight: 17 },
    input: {
      backgroundColor: c.surfaceAlt,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      color: c.text,
      fontSize: 14,
    },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    label: { color: c.textDim, fontSize: 13 },
    budgetInput: { width: 72, textAlign: "center" },
    error: { color: c.danger, fontSize: 13 },
    disabled: { opacity: 0.6 },
    loading: { marginTop: spacing.xl },
    rowCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { color: c.text, fontFamily: fonts.sansSemibold, fontSize: 15 },
    rowSub: { color: c.textDim, fontSize: 12, marginTop: 2 },
    liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
  });
}
