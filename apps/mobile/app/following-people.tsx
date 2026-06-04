import { useCallback, useState } from "react";
import { View, Text, Image, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Users } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchFollowing, type FollowedUser } from "@/api/follows";

// People You Follow: the creators the user follows. Reloads on focus so changes
// made elsewhere (follow/unfollow on a profile) are reflected. Tap a row to open
// that creator's public profile.
export default function FollowingPeopleScreen() {
  const [users, setUsers] = useState<FollowedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setUsers(null);
      setError(null);
      fetchFollowing()
        .then(setUsers)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load following (HTTP ${e.status})` : "Network error");
          console.error("[following-people] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Following" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !users ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>You aren&apos;t following anyone yet. Follow creators to see them here.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/u/${item.username}`)}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Users color="#9a9aa2" size={20} />
                </View>
              )}
              <View style={styles.meta}>
                <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
                <Text style={styles.dim} numberOfLines={1}>@{item.username}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1c1c22" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, marginLeft: 12 },
  name: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
