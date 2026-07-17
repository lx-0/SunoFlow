import { useCallback, useState } from "react";
import { View, Pressable, StyleSheet, Alert, Share, ActivityIndicator, ScrollView } from "react-native";
import { Text } from "@/components/Themed";
import { router, useFocusEffect, type Href } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { getApiKeyId, clearSession } from "@/auth/session";
import { apiDelete } from "@/api/client";
import { exportUserData } from "@/api/account";
import { fetchCredits, type Credits } from "@/api/credits";
import { useTheme } from "@/theme/ThemeContext";
import { THEMES, THEME_LABELS, type ThemeMode, type ThemeName } from "@/theme/theme";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";

const MODES: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export default function SettingsScreen() {
  const { colors, scheme, mode, setMode, themeName, setThemeName } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchCredits().then(setCredits).catch((e) => console.error("[settings] credits load failed", e));
    }, []),
  );

  async function onExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await exportUserData();
      const dir = FileSystem.cacheDirectory;
      if (!dir) throw new Error("no cacheDirectory");
      const path = `${dir}sunoflow-export.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));
      await Share.share({ url: path });
    } catch (e) {
      Alert.alert("Export failed", "Could not export your data. Please try again.");
      console.error("[export] failed", e);
    } finally {
      setExporting(false);
    }
  }

  async function signOut() {
    const id = await getApiKeyId();
    if (id) {
      try {
        await apiDelete(`/api/profile/api-keys/${id}`);
      } catch (e) {
        console.error("[signout] key revoke failed", e);
      }
    }
    await clearSession();
    router.replace("/login");
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Appearance</Text>
      <View style={[styles.segment, { backgroundColor: colors.surface }]}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              style={[styles.segmentItem, active && { backgroundColor: colors.accentStrong }]}
              onPress={() => setMode(m.key)}
            >
              <Text style={[styles.segmentText, { color: active ? colors.onAccent : colors.textDim }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Theme</Text>
      <View style={styles.themeRow}>
        {THEME_NAMES.map((name) => {
          const active = themeName === name;
          const swatch = THEMES[name][scheme].accent;
          return (
            <Pressable
              key={name}
              style={[styles.themeChip, { backgroundColor: colors.surface, borderColor: active ? colors.accent : "transparent" }]}
              onPress={() => setThemeName(name)}
            >
              <View style={[styles.swatch, { backgroundColor: swatch }]} />
              <Text style={[styles.themeText, { color: colors.text }]}>{THEME_LABELS[name]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Credits</Text>
      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <Text style={[styles.rowText, { color: colors.text }]}>
          {credits ? `${credits.remaining} of ${credits.budget} left` : "…"}
        </Text>
        {credits ? <Text style={[styles.rowSub, { color: colors.textDim }]}>{credits.generationsThisMonth} this month</Text> : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Content</Text>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => router.push("/rss-feeds" as Href)}>
        <Text style={[styles.rowText, { color: colors.text }]}>RSS feeds</Text>
        <Text style={[styles.rowSub, { color: colors.textDim }]}>Sources for Inspire</Text>
      </Pressable>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => router.push("/notification-settings" as Href)}>
        <Text style={[styles.rowText, { color: colors.text }]}>Notifications</Text>
      </Pressable>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => router.push("/feedback" as Href)}>
        <Text style={[styles.rowText, { color: colors.text }]}>Send feedback</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Studio</Text>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => router.push("/api-keys" as Href)}>
        <Text style={[styles.rowText, { color: colors.text }]}>API keys</Text>
      </Pressable>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => router.push("/manage-tags" as Href)}>
        <Text style={[styles.rowText, { color: colors.text }]}>Manage tags</Text>
      </Pressable>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => router.push("/rate-limits" as Href)}>
        <Text style={[styles.rowText, { color: colors.text }]}>Rate limits</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Account</Text>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => router.push("/change-password" as Href)}>
        <Text style={[styles.rowText, { color: colors.text }]}>Change password</Text>
      </Pressable>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={onExport} disabled={exporting}>
        <Text style={[styles.rowText, { color: colors.text }]}>Export my data</Text>
        {exporting ? <ActivityIndicator color={colors.textDim} /> : null}
      </Pressable>
      <Pressable style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => router.push("/delete-account" as Href)}>
        <Text style={[styles.rowText, { color: colors.danger }]}>Delete account</Text>
      </Pressable>

      <Pressable style={[styles.signOut, { backgroundColor: colors.surfaceAlt }]} onPress={signOut}>
        <Text style={[styles.signOutText, { color: colors.danger }]}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, padding: 20, gap: 10, paddingBottom: MINIPLAYER_CLEARANCE },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 8 },
  segment: { flexDirection: "row", borderRadius: 12, padding: 4, gap: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
  segmentText: { fontSize: 14, fontWeight: "600" },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 2 },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  themeText: { fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  rowText: { fontSize: 15 },
  rowSub: { fontSize: 13 },
  signOut: { marginTop: "auto", alignItems: "center", paddingVertical: 14, borderRadius: 12 },
  signOutText: { fontSize: 15, fontWeight: "600" },
});
