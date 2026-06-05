import { useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchInviteInfo, acceptInvite, type InviteInfo } from "@/api/playlist-invite";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Playlist-collaboration invite accept screen. Opened via a token-carrying link;
// previews the invited playlist (public GET) and lets the user accept it (auth
// POST), then drops them into the playlist. Notification routing is wired
// elsewhere — this screen only reads `token` from the route and acts on it.
export default function PlaylistInviteScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { token } = useLocalSearchParams<{ token: string }>();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setInvite(null);
      setLoadError(null);
      setAcceptError(null);
      fetchInviteInfo(token)
        .then(setInvite)
        .catch((e: unknown) => {
          setLoadError(messageForError(e, "load"));
          console.error("[playlist-invite] load failed", e);
        });
    }, [token]),
  );

  async function accept() {
    if (busy || !token) return;
    setBusy(true);
    setAcceptError(null);
    try {
      const { playlistId } = await acceptInvite(token);
      router.replace(`/playlist/${playlistId}` as Href);
    } catch (e) {
      setAcceptError(messageForError(e, "accept"));
      console.error("[playlist-invite] accept failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Playlist Invite" }} />
      {loadError ? (
        <View style={styles.centered}><Text style={styles.dim}>{loadError}</Text></View>
      ) : !invite ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.name}>{invite.playlist.name}</Text>
          {invite.playlist.ownerName ? (
            <Text style={styles.owner}>Shared by {invite.playlist.ownerName}</Text>
          ) : null}
          <Text style={styles.count}>{invite.playlist.songCount} songs</Text>
          {invite.playlist.description ? (
            <Text style={styles.description}>{invite.playlist.description}</Text>
          ) : null}

          {acceptError ? <Text style={styles.error}>{acceptError}</Text> : null}

          <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={() => void accept()}>
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Accept invite</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Friendly, status-aware error copy shared by both the initial load and accept.
function messageForError(e: unknown, phase: "load" | "accept"): string {
  if (e instanceof HttpError) {
    if (e.status === 404) return "This invite no longer exists.";
    if (e.status === 409 || e.status === 410) return "This invite has already been used or expired.";
    const verb = phase === "load" ? "load" : "accept";
    return `Couldn't ${verb} invite (HTTP ${e.status})`;
  }
  return "Network error";
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    body: { flex: 1, padding: 24 },
    name: { color: c.text, fontSize: 28, fontWeight: "700" },
    owner: { color: c.textDim, fontSize: 14, marginTop: 8 },
    count: { color: c.textDim, fontSize: 14, marginTop: 4 },
    description: { color: c.textDim, fontSize: 14, lineHeight: 20, marginTop: 16 },
    error: { color: c.danger, fontSize: 13, marginTop: 16 },
    btn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    dim: { color: c.textDim, fontSize: 13 },
  });
}
