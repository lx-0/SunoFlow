import { View, Text, StyleSheet } from "react-native";

// STUB — M004-S04 builds this out (list + detail + reorder + play).
export default function PlaylistsScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Playlists</Text>
      <Text style={styles.d}>Coming in M004-S04.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f" },
  t: { color: "#fff", fontSize: 18 },
  d: { color: "#9a9aa2", marginTop: 6 },
});
