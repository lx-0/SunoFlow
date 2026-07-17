import { useCallback, useState } from "react";
import {
  View, Pressable, Switch, ScrollView, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS,
} from "react-native";
import { Text } from "@/components/Themed";
import { Stack, useFocusEffect } from "expo-router";
import {
  fetchEmailPrefs, updateEmailPrefs, fetchPushPrefs, updatePushPrefs,
  DIGEST_FREQUENCIES, type EmailPrefs, type PushPrefs,
} from "@/api/notification-prefs";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Notification preferences: email + push toggles, digest frequency, quiet hours.
// Every change PATCHes immediately and optimistically — local state flips first,
// the request fires, and on failure we revert + surface an Alert. Email and push
// load independently on focus so one failing endpoint doesn't blank the other.

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState<EmailPrefs | null>(null);
  const [push, setPush] = useState<PushPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchEmailPrefs().then(setEmail).catch((e: unknown) => {
      setError("Couldn't load notification settings.");
      console.error("[notification-settings] email load failed", e);
    });
    fetchPushPrefs().then(setPush).catch((e: unknown) => {
      setError("Couldn't load notification settings.");
      console.error("[notification-settings] push load failed", e);
    });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function patchEmail(patch: Partial<EmailPrefs>) {
    if (!email) return;
    const prev = email;
    setEmail({ ...email, ...patch });
    try {
      await updateEmailPrefs(patch);
    } catch (e) {
      setEmail(prev);
      Alert.alert("Couldn't save", "Your change wasn't saved. Please try again.");
      console.error("[notification-settings] email patch failed", e);
    }
  }

  async function patchPush(patch: Partial<PushPrefs>) {
    if (!push) return;
    const prev = push;
    setPush({ ...push, ...patch });
    try {
      await updatePushPrefs(patch);
    } catch (e) {
      setPush(prev);
      Alert.alert("Couldn't save", "Your change wasn't saved. Please try again.");
      console.error("[notification-settings] push patch failed", e);
    }
  }

  function pickHour(label: string, current: number, onPick: (h: number) => void) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: label,
        options: [...hours.map(formatHour), "Cancel"],
        cancelButtonIndex: hours.length,
      },
      (i) => {
        if (i >= 0 && i < hours.length) onPick(hours[i]);
      },
    );
  }

  function toggleRow(label: string, value: boolean, onChange: (v: boolean) => void) {
    return (
      <View style={styles.row}>
        <Text style={styles.rowText}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.surfaceAlt, true: colors.accentStrong }}
          thumbColor={colors.onAccent}
        />
      </View>
    );
  }

  const loaded = email && push;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Notifications" }} />

      {error ? <Text style={styles.errorLine}>{error}</Text> : null}

      {!loaded ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Email</Text>
          <View style={styles.card}>
            {toggleRow("Welcome emails", email.emailWelcome, (v) => patchEmail({ emailWelcome: v }))}
            <View style={styles.divider} />
            {toggleRow("Generation complete", email.emailGenerationComplete, (v) => patchEmail({ emailGenerationComplete: v }))}
          </View>

          <Text style={styles.subLabel}>Digest frequency</Text>
          <View style={styles.segment}>
            {DIGEST_FREQUENCIES.map((freq) => {
              const active = email.emailDigestFrequency === freq;
              return (
                <Pressable
                  key={freq}
                  style={[styles.segmentItem, active && { backgroundColor: colors.accentStrong }]}
                  onPress={() => patchEmail({ emailDigestFrequency: freq })}
                >
                  <Text style={[styles.segmentText, { color: active ? colors.onAccent : colors.textDim }]}>
                    {capitalize(freq)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.card}>
            {toggleRow("Quiet hours", email.quietHoursEnabled, (v) => patchEmail({ quietHoursEnabled: v }))}
            {email.quietHoursEnabled ? (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.rowText}>From</Text>
                  <Pressable
                    style={styles.hourChip}
                    onPress={() => pickHour("Quiet hours start", email.quietHoursStart, (h) => patchEmail({ quietHoursStart: h }))}
                  >
                    <Text style={styles.hourText}>{formatHour(email.quietHoursStart)}</Text>
                  </Pressable>
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.rowText}>To</Text>
                  <Pressable
                    style={styles.hourChip}
                    onPress={() => pickHour("Quiet hours end", email.quietHoursEnd, (h) => patchEmail({ quietHoursEnd: h }))}
                  >
                    <Text style={styles.hourText}>{formatHour(email.quietHoursEnd)}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Push</Text>
          <Text style={styles.note}>Push delivery requires enabling notifications on this device.</Text>
          <View style={styles.card}>
            {toggleRow("Generation complete", push.pushGenerationComplete, (v) => patchPush({ pushGenerationComplete: v }))}
            <View style={styles.divider} />
            {toggleRow("New follower", push.pushNewFollower, (v) => patchPush({ pushNewFollower: v }))}
            <View style={styles.divider} />
            {toggleRow("Song comment", push.pushSongComment, (v) => patchPush({ pushSongComment: v }))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, gap: 10, paddingBottom: MINIPLAYER_CLEARANCE },
    centered: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
    errorLine: { color: c.textDim, fontSize: 13, marginBottom: 4 },
    sectionTitle: { color: c.textFaint, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 8 },
    subLabel: { color: c.textDim, fontSize: 13, marginTop: 4 },
    note: { color: c.textDim, fontSize: 13, marginBottom: 2 },
    card: { backgroundColor: c.surface, borderRadius: 12, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
    rowText: { color: c.text, fontSize: 15 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 16 },
    segment: { flexDirection: "row", backgroundColor: c.surface, borderRadius: 12, padding: 4, gap: 4 },
    segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
    segmentText: { fontSize: 14, fontWeight: "600" },
    hourChip: { backgroundColor: c.surfaceAlt, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
    hourText: { color: c.text, fontSize: 15, fontWeight: "600" },
  });
}
