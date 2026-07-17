import { useCallback, useState } from "react";
import {
  View, Image, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS,
} from "react-native";
import { Text } from "@/components/Themed";
import { Stack, router, useFocusEffect } from "expo-router";
import { Users, MoreHorizontal, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchFollowing, type FollowedUser } from "@/api/follows";
import { unfollowUser } from "@/api/users";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// People You Follow: the creators the user follows. Reloads on focus so changes
// made elsewhere (follow/unfollow on a profile) are reflected. Tap a row to open
// that creator's public profile.
export default function FollowingPeopleScreen() {
  const [users, setUsers] = useState<FollowedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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

  // Optimistically drop the row; reinsert it (in its original position) on failure.
  function unfollow(u: FollowedUser) {
    setUsers((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((x) => x.id === u.id);
      const next = prev.filter((x) => x.id !== u.id);
      unfollowUser(u.id).catch((e: unknown) => {
        setUsers((cur) => {
          if (!cur || cur.some((x) => x.id === u.id)) return cur;
          const restored = [...cur];
          restored.splice(index >= 0 ? index : restored.length, 0, u);
          return restored;
        });
        Alert.alert("Couldn't unfollow", "Please try again.");
        console.error("[following-people] unfollow failed", e);
      });
      return next;
    });
  }

  function confirmUnfollow(u: FollowedUser) {
    Alert.alert("Unfollow?", `Unfollow @${u.username}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Unfollow", style: "destructive", onPress: () => unfollow(u) },
    ]);
  }

  function rowActions(u: FollowedUser) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: u.displayName,
        options: ["View profile", "Unfollow", "Cancel"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (i) => {
        if (i === 0) router.push(`/u/${u.username}`);
        else if (i === 1) confirmUnfollow(u);
      },
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Following" }} />
      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !users ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : users.length === 0 ? (
        <EmptyState
          Icon={Users}
          title="Not following anyone yet"
          subtitle="Follow creators to see them here."
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/u/${item.username}`)}
              onLongPress={() => rowActions(item)}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Users color={colors.textDim} size={20} />
                </View>
              )}
              <View style={styles.meta}>
                <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
                <Text style={styles.dim} numberOfLines={1}>@{item.username}</Text>
              </View>
              <Pressable onPress={() => rowActions(item)} hitSlop={12} style={styles.moreBtn}>
                <MoreHorizontal color={colors.textDim} size={22} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    listContent: { paddingBottom: MINIPLAYER_CLEARANCE },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceAlt },
    avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
    meta: { flex: 1, marginLeft: 12 },
    moreBtn: { paddingLeft: 12, paddingVertical: 4 },
    name: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
