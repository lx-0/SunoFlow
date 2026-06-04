import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { User } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchUserProfile, fetchUserSongs, followUser, unfollowUser, type UserProfile } from "@/api/users";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

// Public user profile: header (name/bio + follower/following counts + optimistic
// Follow toggle) over the user's public songs. Reloads on focus. Four states.
// The follow toggle keys off the profile's user ID, not the username.
export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!username) {
        setError("No user specified");
        return;
      }
      setProfile(null);
      setSongs(null);
      setError(null);
      Promise.all([fetchUserProfile(username), fetchUserSongs(username)])
        .then(([p, s]) => {
          setProfile(p);
          setFollowing(p.isFollowing);
          setSongs(s);
        })
        .catch((e: unknown) => {
          setError(
            e instanceof HttpError
              ? e.status === 404
                ? "User not found"
                : `Failed to load profile (HTTP ${e.status})`
              : "Network error",
          );
          console.error("[u/username] load failed", e);
        });
    }, [username]),
  );

  const onToggleFollow = useCallback(async () => {
    if (!profile || !profile.id || followBusy) return;
    const next = !following;
    setFollowing(next); // optimistic
    setFollowBusy(true);
    try {
      if (next) {
        await followUser(profile.id);
      } else {
        await unfollowUser(profile.id);
      }
    } catch (e) {
      setFollowing(!next); // rollback
      console.error("[u/username] follow toggle failed", e);
    } finally {
      setFollowBusy(false);
    }
  }, [profile, following, followBusy]);

  const title = profile?.displayName ?? username ?? "Profile";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !profile || !songs ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.identity}>
                <User color="#8b7cff" size={28} />
                <View style={styles.identityText}>
                  <Text style={styles.name} numberOfLines={1}>{profile.displayName}</Text>
                  <Text style={styles.handle} numberOfLines={1}>@{profile.username}</Text>
                </View>
              </View>
              {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              <View style={styles.stats}>
                <Stat value={profile.followersCount} label="Followers" />
                <Stat value={profile.followingCount} label="Following" />
                <Stat value={profile.songsCount} label="Songs" />
              </View>
              <Pressable
                style={[styles.followBtn, following && styles.followingBtn]}
                onPress={() => void onToggleFollow()}
                disabled={!profile.id || followBusy}
              >
                <Text style={[styles.followText, following && styles.followingText]}>
                  {following ? "Following" : "Follow"}
                </Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centered}><Text style={styles.dim}>No public songs yet.</Text></View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.row}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.push("/player");
                } catch (e) {
                  console.error("[u/username] play failed", e);
                }
              }}
            >
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              {item.artist ? <Text style={styles.dim} numberOfLines={1}>{item.artist}</Text> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  identity: { flexDirection: "row", alignItems: "center" },
  identityText: { marginLeft: 12, flex: 1 },
  name: { color: "#fff", fontSize: 22, fontWeight: "700" },
  handle: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
  bio: { color: "#fff", fontSize: 14, marginTop: 12, lineHeight: 20 },
  stats: { flexDirection: "row", marginTop: 16 },
  stat: { marginRight: 24, alignItems: "flex-start" },
  statValue: { color: "#fff", fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  statLabel: { color: "#9a9aa2", fontSize: 12, marginTop: 2 },
  followBtn: {
    marginTop: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#8b7cff",
  },
  followingBtn: { backgroundColor: "transparent", borderColor: "#1c1c22", borderWidth: 1 },
  followText: { color: "#0b0b0f", fontSize: 14, fontWeight: "700" },
  followingText: { color: "#fff" },
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: "#1c1c22", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
