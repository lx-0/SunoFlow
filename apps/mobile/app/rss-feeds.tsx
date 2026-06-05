import { useCallback, useState } from "react";
import {
  View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Plus, X } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchRssFeeds, addRssFeed, deleteRssFeed, type RssFeed } from "@/api/rss";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// RSS feed management: add (by URL) and delete feeds. Feeds power Inspire's
// "Today's Picks" — without at least one, Inspire is empty.
export default function RssFeedsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [feeds, setFeeds] = useState<RssFeed[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetchRssFeeds()
      .then(setFeeds)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load (HTTP ${e.status})` : "Network error");
        console.error("[rss-feeds] load failed", e);
      });
  }, []);

  useFocusEffect(useCallback(() => { setFeeds(null); load(); }, [load]));

  async function onAdd() {
    if (busy || !url.trim()) return;
    setBusy(true);
    try {
      await addRssFeed(url);
      setUrl("");
      setAdding(false);
      load();
    } catch (e) {
      Alert.alert("Couldn't add feed", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[rss-feeds] add failed", e);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(f: RssFeed) {
    Alert.alert("Delete feed?", `Delete "${f.title ?? f.url}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteRssFeed(f.id); load(); }
          catch (e) { Alert.alert("Couldn't delete", "Please try again."); console.error("[rss-feeds] delete failed", e); }
        },
      },
    ]);
  }

  function rowActions(f: RssFeed) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: f.title ?? f.url,
        options: ["Delete", "Cancel"],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      (i) => {
        if (i === 0) confirmDelete(f);
      },
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "RSS Feeds",
          headerRight: () => (
            <Pressable onPress={() => setAdding((v) => !v)} hitSlop={8}>
              {adding ? <X color={colors.accent} size={22} /> : <Plus color={colors.accent} size={22} />}
            </Pressable>
          ),
        }}
      />

      <Text style={styles.helper}>{"Add RSS feeds to power Inspire's Today's Picks."}</Text>

      {adding ? (
        <View style={styles.createCard}>
          <Text style={styles.label}>Feed URL</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com/feed.xml"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Pressable
            style={[styles.saveBtn, (!url.trim() || busy) && styles.btnDisabled]}
            onPress={onAdd}
            disabled={!url.trim() || busy}
          >
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Add feed</Text>}
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !feeds ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : feeds.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>No feeds yet. Tap + to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={feeds}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => rowActions(item)}>
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.title ?? item.url}</Text>
                <Text style={styles.dim} numberOfLines={1}>{item.url}</Text>
              </View>
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
    helper: { color: c.textDim, fontSize: 13, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    createCard: { padding: 16, gap: 8, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    label: { color: c.textDim, fontSize: 13, marginTop: 4 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    saveBtn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 8 },
    saveText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    btnDisabled: { opacity: 0.45 },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    meta: { flex: 1, marginRight: 12 },
    title: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
