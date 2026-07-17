import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  ActionSheetIOS,
  StyleSheet,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Flame, ChevronDown } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchProfile,
  fetchProfileStats,
  fetchStreak,
  fetchMilestones,
  fetchPreferences,
  updateProfile,
  updatePreferences,
  type Profile,
  type ProfilePreferences,
  type ProfileStats,
  type Milestone,
} from "@/api/profile";
import { fetchSongsPage } from "@/api/songs";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import type { Song } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, type ThemeColors } from "@/theme/theme";

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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [featuredSongId, setFeaturedSongId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The user's own songs, for the featured-song picker (id + title).
  const [mySongs, setMySongs] = useState<Song[]>([]);

  // Preferences (default style + comma-separated genres) — own load + save state.
  const [prefs, setPrefs] = useState<ProfilePreferences | null>(null);
  const [defaultStyle, setDefaultStyle] = useState("");
  const [genresText, setGenresText] = useState("");
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

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
          setAvatarUrl(p.avatarUrl ?? "");
          setBannerUrl(p.bannerUrl ?? "");
          setFeaturedSongId(p.featuredSongId);
        })
        .catch((e: unknown) => {
          if (!active) return;
          setError(e instanceof HttpError ? `Failed to load profile (HTTP ${e.status})` : "Network error");
          console.error("[profile] load profile failed", e);
        });

      fetchPreferences()
        .then((p) => {
          if (!active) return;
          setPrefs(p);
          setDefaultStyle(p.defaultStyle ?? "");
          setGenresText(p.preferredGenres.join(", "));
        })
        .catch((e: unknown) => { if (active) setSecondaryError(true); console.error("[profile] load preferences failed", e); });

      fetchSongsPage({})
        .then((page) => active && setMySongs(page.songs))
        .catch((e: unknown) => { if (active) setSecondaryError(true); console.error("[profile] load songs failed", e); });

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

    const input: {
      name?: string;
      bio?: string | null;
      username?: string | null;
      avatarUrl?: string | null;
      bannerUrl?: string | null;
      featuredSongId?: string | null;
    } = {};
    if (trimmedName !== (profile.name ?? "")) input.name = trimmedName;
    const nextUsername = username.trim();
    if (nextUsername !== (profile.username ?? "")) input.username = nextUsername.length > 0 ? nextUsername : null;
    if (bio !== (profile.bio ?? "")) input.bio = bio.length > 0 ? bio : null;
    const nextAvatar = avatarUrl.trim();
    if (nextAvatar !== (profile.avatarUrl ?? "")) input.avatarUrl = nextAvatar.length > 0 ? nextAvatar : null;
    const nextBanner = bannerUrl.trim();
    if (nextBanner !== (profile.bannerUrl ?? "")) input.bannerUrl = nextBanner.length > 0 ? nextBanner : null;
    if (featuredSongId !== profile.featuredSongId) input.featuredSongId = featuredSongId;

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
        avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : profile.avatarUrl,
        bannerUrl: input.bannerUrl !== undefined ? input.bannerUrl : profile.bannerUrl,
        featuredSongId: input.featuredSongId !== undefined ? input.featuredSongId : profile.featuredSongId,
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

  // Featured-song picker: native action sheet of the user's song titles, plus
  // Clear (→ null) and Cancel. Selection stages featuredSongId; it persists on Save.
  function pickFeaturedSong() {
    const options = [...mySongs.map((s) => s.title), "Clear", "Cancel"];
    const clearIndex = mySongs.length;
    const cancelIndex = mySongs.length + 1;
    ActionSheetIOS.showActionSheetWithOptions(
      { options, destructiveButtonIndex: clearIndex, cancelButtonIndex: cancelIndex, title: "Featured song" },
      (index) => {
        if (index === cancelIndex) return;
        setFeaturedSongId(index === clearIndex ? null : (mySongs[index]?.id ?? null));
        setSaved(false);
      },
    );
  }

  const featuredTitle = featuredSongId
    ? (mySongs.find((s) => s.id === featuredSongId)?.title ?? "Selected song")
    : "None";

  async function savePreferences() {
    if (prefsBusy || !prefs) return;

    const trimmedStyle = defaultStyle.trim();
    const nextStyle = trimmedStyle.length > 0 ? trimmedStyle : null;
    const nextGenres = genresText
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    const patch: { defaultStyle?: string | null; preferredGenres?: string[] } = {};
    if (nextStyle !== prefs.defaultStyle) patch.defaultStyle = nextStyle;
    if (nextGenres.join(" ") !== prefs.preferredGenres.join(" ")) patch.preferredGenres = nextGenres;

    if (Object.keys(patch).length === 0) {
      setPrefsSaved(true);
      setPrefsError(null);
      return;
    }

    setPrefsBusy(true);
    setPrefsSaved(false);
    setPrefsError(null);
    try {
      await updatePreferences(patch);
      setPrefs({
        defaultStyle: patch.defaultStyle !== undefined ? patch.defaultStyle : prefs.defaultStyle,
        preferredGenres: patch.preferredGenres !== undefined ? patch.preferredGenres : prefs.preferredGenres,
      });
      setPrefsSaved(true);
    } catch (e) {
      setPrefsError(
        e instanceof HttpError ? `Couldn't save (HTTP ${e.status})` : e instanceof Error ? e.message : "Couldn't save preferences.",
      );
      console.error("[profile] save preferences failed", e);
    } finally {
      setPrefsBusy(false);
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
          {/* Stats — top of profile */}
          {stats ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Stats</Text>
              <View style={styles.statRow}>
                <StatItem label="songs" value={String(stats.totalSongs)} styles={styles} />
                <StatItem label="favorites" value={String(stats.totalFavorites)} styles={styles} />
                <StatItem label="playlists" value={String(stats.totalPlaylists)} styles={styles} />
                <StatItem label="followers" value={String(stats.followersCount)} styles={styles} />
                <StatItem label="following" value={String(stats.followingCount)} styles={styles} />
              </View>
              <Text style={styles.memberSince}>
                Member since {stats.memberSince ? new Date(stats.memberSince).toLocaleDateString() : "–"}
              </Text>
            </View>
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

          {secondaryError ? (
            <Text style={styles.secondaryError}>Couldn&apos;t load some stats. Pull back later to retry.</Text>
          ) : null}

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

            <Text style={styles.label}>Avatar URL</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              onChangeText={(t) => {
                setAvatarUrl(t);
                setSaved(false);
              }}
              placeholder="https://…/avatar.jpg"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>Banner URL</Text>
            <TextInput
              style={styles.input}
              value={bannerUrl}
              onChangeText={(t) => {
                setBannerUrl(t);
                setSaved(false);
              }}
              placeholder="https://…/banner.jpg"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>Featured song</Text>
            <Pressable style={styles.picker} onPress={pickFeaturedSong}>
              <Text style={styles.pickerText} numberOfLines={1}>
                {featuredTitle}
              </Text>
              <ChevronDown color={colors.textDim} size={18} />
            </Pressable>

            {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

            <View style={styles.saveRow}>
              <Pressable style={[styles.btn, !canSave && styles.btnDisabled]} disabled={!canSave} onPress={save}>
                {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Save</Text>}
              </Pressable>
              {saved && !busy ? <Text style={styles.savedText}>Saved</Text> : null}
            </View>
          </View>

          {/* Preferences */}
          {prefs ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Preferences</Text>

              <Text style={styles.label}>Default style</Text>
              <TextInput
                style={styles.input}
                value={defaultStyle}
                onChangeText={(t) => {
                  setDefaultStyle(t);
                  setPrefsSaved(false);
                }}
                placeholder="e.g. lo-fi, mellow"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Preferred genres</Text>
              <TextInput
                style={styles.input}
                value={genresText}
                onChangeText={(t) => {
                  setGenresText(t);
                  setPrefsSaved(false);
                }}
                placeholder="comma-separated, e.g. pop, jazz"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {prefsError ? <Text style={styles.error}>{prefsError}</Text> : null}

              <View style={styles.saveRow}>
                <Pressable
                  style={[styles.btn, prefsBusy && styles.btnDisabled]}
                  disabled={prefsBusy}
                  onPress={savePreferences}
                >
                  {prefsBusy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Save preferences</Text>}
                </Pressable>
                {prefsSaved && !prefsBusy ? <Text style={styles.savedText}>Saved</Text> : null}
              </View>
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
                  <Text style={styles.milestoneTag} numberOfLines={1}>{m.type}</Text>
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
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    scroll: { padding: 16, gap: 16, paddingBottom: MINIPLAYER_CLEARANCE },
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
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 10,
      color: c.text,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    bioInput: { minHeight: 88 },
    picker: {
      backgroundColor: c.surfaceAlt,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    pickerText: { color: c.text, fontSize: 15, flex: 1 },
    error: { color: c.danger, fontSize: 13, marginTop: 14 },
    secondaryError: { color: c.warnFg ?? c.textDim, fontSize: 12 },
    saveRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
    btn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center" },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    savedText: { color: c.successFg, fontSize: 14, fontWeight: "600" },
    streakRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    streakText: { color: c.text, fontSize: 15, fontWeight: "600" },
    statRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 16, rowGap: 6, marginTop: 2 },
    statItem: { flexDirection: "row", alignItems: "baseline", gap: 5 },
    statValue: { color: c.text, fontSize: 16, fontFamily: fonts.monoSemibold, fontVariant: ["tabular-nums"] },
    statLabel: { color: c.textDim, fontSize: 12 },
    memberSince: { color: c.textDim, fontSize: 12, marginTop: 10 },
    milestone: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    milestoneTag: { color: c.textDim, fontSize: 11, fontFamily: fonts.mono, minWidth: 64 },
    milestoneMeta: { flex: 1 },
    milestoneLabel: { color: c.text, fontSize: 15, fontWeight: "600" },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
