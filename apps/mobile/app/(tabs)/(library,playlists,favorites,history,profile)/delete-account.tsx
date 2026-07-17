import { useState } from "react";
import { View, Pressable, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { Stack, router } from "expo-router";
import { HttpError } from "@/api/client";
import { deleteAccount } from "@/api/account";
import { clearSession } from "@/auth/session";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Permanent account deletion. Requires the account password + the user's own
// email as confirmation (server checks confirmEmail === user.email).
export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and all your songs. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void run() },
      ],
    );
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password, email.trim());
      await clearSession();
      router.replace("/login");
    } catch (e) {
      setError(
        e instanceof HttpError && e.status === 400
          ? "Email or password didn't match."
          : e instanceof HttpError
            ? `Couldn't delete account (HTTP ${e.status})`
            : "Couldn't delete account.",
      );
      console.error("[delete-account] failed", e);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Delete Account" }} />
      <Text style={styles.warn}>This permanently deletes your account and all your songs. It cannot be undone.</Text>

      <Text style={styles.label}>Your email (to confirm)</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textFaint} />
      <Text style={styles.label}>Password</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholderTextColor={colors.textFaint} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.btn, !canSubmit && styles.btnDisabled]} disabled={!canSubmit} onPress={confirmDelete}>
        {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Delete my account</Text>}
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, padding: 20 },
    warn: { color: c.textDim, fontSize: 14, lineHeight: 20 },
    label: { color: c.textDim, fontSize: 13, marginTop: 14, marginBottom: 6 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    error: { color: c.danger, fontSize: 13, marginTop: 14 },
    btn: { backgroundColor: c.danger, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
  });
}
