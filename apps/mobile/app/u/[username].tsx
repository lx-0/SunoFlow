import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { User } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchUserProfile,
  fetchUserSongs,
  fetchUserLikedSongs,
  fetchUserPlaylists,
  followUser,
  unfollowUser,
  type UserProfile,
  type UserPlaylist,
} from "@/api/users";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

type Tab = "songs" | "liked" | "playlists";
const TABS: { key: Tab; label: string }[] = [
  { key: "songs", label: "Songs" },
  { key: "liked", label: "Liked" },
  { key: "playlists", label: "Playlists" },
];

// Public user profile: header (name/bio + follower/following counts + optimistic
// Follow toggle) over the user's public songs. Reloads on focus. Four states.
// The follow toggle keys off the profile's user ID, not the username.
export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [liked, setLiked] = useState<Song[] | null>(null);
  const [playlists, setPlaylists] = useState<UserPlaylist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("songs");

  useFocusEffect(
    useCallback(() => {
      if (!username) {
        setError("No user specified");
        return;
      }
      setProfile(null);
      setSongs(null);
      setLiked(null);
      setPlaylists(null);
      setError(null);
      Promise.all([
        fetchUserProfile(username),
        fetchUserSongs(username),
        fetchUserLikedSongs(username),
        fetchUserPlaylists(username),
      ])
        .then(([p, s, l, pl]) => {
          setProfile(p);
          setFollowing(p.isFollowing);
          setSongs(s);
          setLiked(l);
          setPlaylists(pl);
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
      ) : !profile || !songs || !liked || !playlists ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : (
        <ProfileContent
          profile={profile}
          songs={songs}
          liked={liked}
          playlists={playlists}
          tab={tab}
          onTab={setTab}
          following={following}
          followBusy={followBusy}
          onToggleFollow={onToggleFollow}
        />
      )}
    </View>
  );
}

function ProfileContent({
  profile,
  songs,
  liked,
  playlists,
  tab,
  onTab,
  following,
  followBusy,
  onToggleFollow,
}: {
  profile: UserProfile;
  songs: Song[];
  liked: Song[];
  playlists: UserPlaylist[];
  tab: Tab;
  onTab: (t: Tab) => void;
  following: boolean;
  followBusy: boolean;
  onToggleFollow: () => Promise<void>;
}) {
  const header = (
    <View>
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
      <View style={styles.segment}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.segmentItem, tab === t.key && styles.segmentItemActive]}
            onPress={() => onTab(t.key)}
          >
            <Text style={[styles.segmentText, tab === t.key && styles.segmentTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (tab === "playlists") {
    return (
      <FlatList
        data={playlists}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.centered}><Text style={styles.dim}>No public playlists yet.</Text></View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/playlist/${item.id}`)}>
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.dim} numberOfLines={1}>
              {item.songCount} {item.songCount === 1 ? "song" : "songs"}
            </Text>
          </Pressable>
        )}
      />
    );
  }

  const list = tab === "liked" ? liked : songs;
  const emptyText = tab === "liked" ? "No liked songs yet." : "No public songs yet.";
  return (
    <FlatList
      data={list}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.centered}><Text style={styles.dim}>{emptyText}</Text></View>
      }
      renderItem={({ item, index }) => (
        <Pressable
          style={styles.row}
          onPress={async () => {
            try {
              await playQueue(list, index);
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
  segment: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginRight: 8,
  },
  segmentItemActive: { backgroundColor: "#8b7cff" },
  segmentText: { color: "#9a9aa2", fontSize: 14, fontWeight: "600" },
  segmentTextActive: { color: "#0b0b0f" },
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: "#1c1c22", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
