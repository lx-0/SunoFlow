import { useCallback, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { Stack, useFocusEffect, router, type Href } from "expo-router";
import { Bell, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notificationTarget,
  type AppNotification,
} from "@/api/notifications";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Notifications feed. Reloads on focus. Unread rows are brighter and carry an
// accent dot; tapping a row marks it read (if unread) and navigates to its target
// (song/playlist/profile/etc. via notificationTarget). A header action clears all.
export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((clear = true) => {
    if (clear) setItems(null);
    setError(null);
    return fetchNotifications()
      .then((res) => {
        setItems(res.notifications);
        setUnread(res.unreadCount);
      })
      .catch((e: unknown) => {
        setError(
          e instanceof HttpError
            ? `Failed to load notifications (HTTP ${e.status})`
            : "Network error",
        );
        console.error("[notifications] load failed", e);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(false).finally(() => setRefreshing(false));
  }, [load]);

  const onRowPress = useCallback((n: AppNotification) => {
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev);
      setUnread((u) => Math.max(0, u - 1));
      markNotificationRead(n.id).catch((e: unknown) =>
        console.error("[notifications] mark read failed", e),
      );
    }
    const target = notificationTarget(n);
    if (target) router.push(target as Href);
  }, []);

  const onMarkAll = useCallback(() => {
    setItems((prev) => prev?.map((x) => ({ ...x, read: true })) ?? prev);
    setUnread(0);
    markAllNotificationsRead().catch((e: unknown) =>
      console.error("[notifications] mark all read failed", e),
    );
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () =>
            unread > 0 ? (
              <Pressable onPress={onMarkAll} hitSlop={8}>
                <Text style={styles.headerAction}>Mark all read</Text>
              </Pressable>
            ) : null,
        }}
      />
      {error && !items ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !items ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          Icon={Bell}
          title="You're all caught up"
          subtitle="No notifications yet."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textDim} />
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onRowPress(item)}>
              <View style={styles.dotCol}>
                {!item.read ? <View style={styles.dot} /> : null}
              </View>
              <View style={styles.meta}>
                {item.title ? (
                  <Text
                    style={[styles.title, item.read && styles.titleRead]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                ) : null}
                {item.message ? (
                  <Text style={styles.message} numberOfLines={3}>
                    {item.message}
                  </Text>
                ) : null}
                {item.createdAt ? (
                  <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

// createdAt is a timestamp, not a duration — render a coarse relative-time string,
// falling back to the raw value if it isn't parseable.
function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const secs = Math.round((Date.now() - t) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString();
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    listContent: { paddingBottom: MINIPLAYER_CLEARANCE },
    headerAction: { color: c.accent, fontSize: 14, marginRight: 4 },
    row: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dotCol: { width: 18, paddingTop: 6, alignItems: "flex-start" },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
    meta: { flex: 1 },
    title: { color: c.text, fontSize: 15, fontWeight: "600" },
    titleRead: { color: c.textDim, fontWeight: "500" },
    message: { color: c.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 },
    time: { color: c.textFaint, fontSize: 12, marginTop: 6 },
  });
}
