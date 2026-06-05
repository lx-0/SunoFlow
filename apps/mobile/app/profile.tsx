import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Flame } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchProfile,
  fetchProfileStats,
  fetchStreak,
  fetchMilestones,
  updateProfile,
  type Profile,
  type ProfileStats,
  type Milestone,
} from "@/api/profile";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

type Styles = ReturnType<typeof makeStyles>;

interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

// Editable identity (name/username/bio) plus read-only headline stats, streak,
// and earned milestones. Loads all four endpoints on focus; each guards its own
// section so a sparse response simply renders less. Save sends only changed fields.
export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [error, setError] = useState<string | null>(null);
  // One shared notice for the secondary (stats/streak/milestones) loads, so a
  // failed sub-load surfaces instead of masquerading as "no data".
  const [secondaryError, setSecondaryError] = useState(false);

  // Editable form fields.
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      setSecondaryError(false);

      fetchProfile()
        .then((p) => {
          if (!active) return;
          setProfile(p);
          setName(p.name ?? "");
          setUsername(p.username ?? "");
          setBio(p.bio ?? "");
        })
        .catch((e: unknown) => {
          if (!active) return;
          setError(e instanceof HttpError ? `Failed to load profile (HTTP ${e.status})` : "Network error");
          console.error("[profile] load profile failed", e);
        });

      fetchProfileStats()
        .then((s) => active && setStats(s))
        .catch((e: unknown) => { if (active) setSecondaryError(true); console.error("[profile] load stats failed", e); });

      fetchStreak()
        .then((s) => active && setStreak(s))
        .catch((e: unknown) => { if (active) setSecondaryError(true); console.error("[profile] load streak failed", e); });

      fetchMilestones()
        .then((m) => active && setMilestones(m))
        .catch((e: unknown) => { if (active) setSecondaryError(true); console.error("[profile] load milestones failed", e); });

      return () => {
        active = false;
      };
    }, []),
  );

  async function save() {
    if (busy || !profile) return;
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return;

    const input: { name?: string; bio?: string | null; username?: string | null } = {};
    if (trimmedName !== (profile.name ?? "")) input.name = trimmedName;
    const nextUsername = username.trim();
    if (nextUsername !== (profile.username ?? "")) input.username = nextUsername.length > 0 ? nextUsername : null;
    if (bio !== (profile.bio ?? "")) input.bio = bio.length > 0 ? bio : null;

    if (Object.keys(input).length === 0) {
      setSaved(true);
      setSaveError(null);
      return;
    }

    setBusy(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateProfile(input);
      setProfile({
        ...profile,
        name: input.name !== undefined ? input.name : profile.name,
        username: input.username !== undefined ? input.username : profile.username,
        bio: input.bio !== undefined ? input.bio : profile.bio,
      });
      setSaved(true);
    } catch (e) {
      setSaveError(
        e instanceof HttpError ? `Couldn't save (HTTP ${e.status})` : e instanceof Error ? e.message : "Couldn't save profile.",
      );
      console.error("[profile] save failed", e);
    } finally {
      setBusy(false);
    }
  }

  const canSave = name.trim().length > 0 && !busy;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "My Profile" }} />
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>{error}</Text>
        </View>
      ) : !profile ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Editable identity */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profile</Text>

            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setSaved(false);
              }}
              placeholder="Your name"
              placeholderTextColor={colors.textFaint}
              maxLength={100}
            />

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                setSaved(false);
              }}
              placeholder="optional"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={(t) => {
                setBio(t);
                setSaved(false);
              }}
              placeholder="Tell people about your music"
              placeholderTextColor={colors.textFaint}
              multiline
              textAlignVertical="top"
            />

            {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

            <View style={styles.saveRow}>
              <Pressable style={[styles.btn, !canSave && styles.btnDisabled]} disabled={!canSave} onPress={save}>
                {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Save</Text>}
              </Pressable>
              {saved && !busy ? <Text style={styles.savedText}>Saved</Text> : null}
            </View>
          </View>

          {secondaryError ? (
            <Text style={styles.secondaryError}>Couldn&apos;t load some stats. Pull back later to retry.</Text>
          ) : null}

          {/* Streak */}
          {streak ? (
            <View style={styles.card}>
              <View style={styles.streakRow}>
                <Flame color={colors.warnFg ?? colors.accent} size={16} />
                <Text style={styles.streakText}>
                  {streak.currentStreak} day streak · longest {streak.longestStreak}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Stats */}
          {stats ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Stats</Text>
              <View style={styles.grid}>
                <StatItem label="Songs" value={String(stats.totalSongs)} styles={styles} />
                <StatItem label="Favorites" value={String(stats.totalFavorites)} styles={styles} />
                <StatItem label="Playlists" value={String(stats.totalPlaylists)} styles={styles} />
                <StatItem label="Followers" value={String(stats.followersCount)} styles={styles} />
                <StatItem label="Following" value={String(stats.followingCount)} styles={styles} />
              </View>
              <Text style={styles.memberSince}>
                Member since {stats.memberSince ? new Date(stats.memberSince).toLocaleDateString() : "–"}
              </Text>
            </View>
          ) : null}

          {/* Milestones */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Milestones</Text>
            {milestones.length === 0 ? (
              <Text style={styles.dim}>No milestones yet</Text>
            ) : (
              milestones.map((m) => (
                <View key={`${m.type}-${m.earnedAt}`} style={styles.milestone}>
                  <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
                  <View style={styles.milestoneMeta}>
                    <Text style={styles.milestoneLabel} numberOfLines={1}>
                      {m.label}
                    </Text>
                    <Text style={styles.dim} numberOfLines={2}>
                      {m.description}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StatItem({ label, value, styles }: { label: string; value: string; styles: Styles }) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.gridNum}>{value}</Text>
      <Text style={styles.dim}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    scroll: { padding: 16, gap: 16 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 16,
    },
    cardTitle: { color: c.text, fontSize: 16, fontWeight: "700", marginBottom: 8 },
    label: { color: c.textDim, fontSize: 13, marginTop: 14, marginBottom: 6 },
    input: {
      backgroundColor: c.surfaceAlt,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    bioInput: { minHeight: 88 },
    error: { color: c.danger, fontSize: 13, marginTop: 14 },
    secondaryError: { color: c.warnFg ?? c.textDim, fontSize: 12 },
    saveRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
    btn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center" },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    savedText: { color: c.successFg, fontSize: 14, fontWeight: "600" },
    streakRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    streakText: { color: c.text, fontSize: 15, fontWeight: "600" },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    gridItem: { width: "33.33%", paddingVertical: 10, alignItems: "center" },
    gridNum: { color: c.text, fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },
    memberSince: { color: c.textDim, fontSize: 13, marginTop: 8 },
    milestone: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    milestoneEmoji: { fontSize: 22 },
    milestoneMeta: { flex: 1 },
    milestoneLabel: { color: c.text, fontSize: 15, fontWeight: "600" },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
