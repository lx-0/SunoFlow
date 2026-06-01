import { View, Text, Pressable, StyleSheet } from "react-native";
import { clearTokens } from "@/auth/session";

// STUB — M004-S04 fleshes this out. Sign-out clears the secure-store tokens
// (and should call the backend revoke endpoint from M004-S02-T03 once wired).
export default function SettingsScreen() {
  return (
    <View style={styles.c}>
      <Pressable
        style={styles.btn}
        onPress={async () => {
          await clearTokens();
          // TODO(M004-S02-T03): call POST /api/v1/auth/revoke before clearing.
        }}
      >
        <Text style={styles.btnText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f" },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: "#1c1c22" },
  btnText: { color: "#fff", fontSize: 15 },
});
