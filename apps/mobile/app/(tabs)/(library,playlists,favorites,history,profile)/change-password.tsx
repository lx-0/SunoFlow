import { useState } from "react";
import {
  Pressable, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, StyleSheet, Alert,
} from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { Stack, router } from "expo-router";
import { HttpError } from "@/api/client";
import { changePassword } from "@/api/account";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useHeaderOffset } from "@/hooks/useHeaderOffset";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const headerOffset = useHeaderOffset();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      Alert.alert("Password changed", "Your password has been updated.");
      router.back();
    } catch (e) {
      setError(
        e instanceof HttpError
          ? e.status === 400
            ? "Current password is incorrect."
            : `Couldn't change password (HTTP ${e.status})`
          : e instanceof Error
            ? e.message
            : "Couldn't change password.",
      );
      console.error("[change-password] failed", e);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword.length > 0 && !busy;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={headerOffset}>
      <Stack.Screen options={{ title: "Change Password" }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Current password</Text>
        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" placeholderTextColor={colors.textFaint} />
        <Text style={styles.label}>New password</Text>
        <TextInput style={styles.input} value={newPassword} onChangeText={setNew} secureTextEntry autoCapitalize="none" placeholder="At least 8 characters" placeholderTextColor={colors.textFaint} />
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" placeholderTextColor={colors.textFaint} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.btn, !canSubmit && styles.btnDisabled]} disabled={!canSubmit} onPress={submit}>
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Update password</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: MINIPLAYER_CLEARANCE },
    label: { color: c.textDim, fontSize: 13, marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    error: { color: c.danger, fontSize: 13, marginTop: 14 },
    btn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
  });
}
