import { useCallback, useState } from "react";
import {
  View, Text, TextInput, Pressable, Switch, FlatList, Image, Share,
  ActivityIndicator, StyleSheet, Alert,
} from "react-native";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Users, X, Link2 } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchPlaylistCollabMeta, fetchCollaborators, toggleCollaborative,
  inviteCollaborator, createInviteLink, removeCollaborator,
  type Collaborator,
} from "@/api/collaborators";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

type Role = "editor" | "viewer";

// Owner-side playlist collaboration. Invite paths require collaborative mode ON
// (server-enforced), so the toggle gates the invite controls. The invitee accepts
// on the web (or via a deep link once a URL scheme is configured).
export default function CollaboratorsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [name, setName] = useState("Playlist");
  const [isOwner, setIsOwner] = useState(true);
  const [collaborative, setCollaborative] = useState(false);
  const [list, setList] = useState<Collaborator[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [inviting, setInviting] = useState(false);
  const [togglingCollab, setTogglingCollab] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [meta, cols] = await Promise.all([
        fetchPlaylistCollabMeta(id),
        fetchCollaborators(id).catch(() => [] as Collaborator[]),
      ]);
      setName(meta.name);
      setIsOwner(meta.isOwner);
      setCollaborative(meta.isCollaborative);
      setList(cols);
    } catch (e) {
      setError(
        e instanceof HttpError
          ? e.status === 404 ? "Only the owner can manage collaborators." : `Couldn't load (HTTP ${e.status})`
          : "Network error",
      );
      console.error("[collaborators] load failed", e);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function onToggleCollaborative(next: boolean) {
    if (togglingCollab) return;
    setTogglingCollab(true);
    try {
      const value = await toggleCollaborative(id);
      setCollaborative(value);
    } catch (e) {
      Alert.alert("Couldn't update", "Failed to change collaborative mode.");
      console.error("[collaborators] toggle failed", e);
    } finally {
      setTogglingCollab(false);
    }
  }

  async function onInvite() {
    if (inviting || !username.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await inviteCollaborator(id, username, role);
      setUsername("");
      setInviteMsg(`Invited @${username.trim()}`);
      await load();
    } catch (e) {
      setInviteMsg(
        e instanceof HttpError && e.message ? e.message : "Couldn't invite that user.",
      );
      console.error("[collaborators] invite failed", e);
    } finally {
      setInviting(false);
    }
  }

  async function onShareLink() {
    try {
      const url = await createInviteLink(id, role);
      await Share.share({ message: `Join my playlist "${name}" on SunoFlow: ${url}`, url });
      await load();
    } catch (e) {
      Alert.alert("Couldn't create link", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[collaborators] invite link failed", e);
    }
  }

  function onRemove(c: Collaborator) {
    const who = c.username ? `@${c.username}` : "this collaborator";
    Alert.alert("Remove collaborator?", `Remove ${who} from "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            await removeCollaborator(id, c.id);
            await load();
          } catch (e) {
            Alert.alert("Couldn't remove", "Please try again.");
            console.error("[collaborators] remove failed", e);
          }
        },
      },
    ]);
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Collaborators" }} />
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Collaborators" }} />
      <FlatList
        data={list ?? []}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Collaborative mode</Text>
                <Text style={styles.dim}>
                  {collaborative ? "Anyone you invite can add songs." : "Turn on to invite people."}
                </Text>
              </View>
              <Switch
                value={collaborative}
                onValueChange={onToggleCollaborative}
                disabled={!isOwner || togglingCollab}
                trackColor={{ false: colors.surfaceAlt, true: colors.accentStrong }}
                thumbColor={colors.onAccent}
              />
            </View>

            {collaborative && isOwner ? (
              <View style={styles.inviteBox}>
                <View style={styles.roleSeg}>
                  {(["editor", "viewer"] as Role[]).map((r) => {
                    const active = role === r;
                    return (
                      <Pressable
                        key={r}
                        style={[styles.roleItem, active && { backgroundColor: colors.accentStrong }]}
                        onPress={() => setRole(r)}
                      >
                        <Text style={[styles.roleText, { color: active ? colors.onAccent : colors.textDim }]}>
                          {r === "editor" ? "Editor" : "Viewer"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.inviteRow}>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="username"
                    placeholderTextColor={colors.textFaint}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={[styles.inviteBtn, (!username.trim() || inviting) && styles.btnDisabled]}
                    onPress={onInvite}
                    disabled={!username.trim() || inviting}
                  >
                    {inviting ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.inviteBtnText}>Invite</Text>}
                  </Pressable>
                </View>
                {inviteMsg ? <Text style={styles.dim}>{inviteMsg}</Text> : null}
                <Pressable style={styles.linkBtn} onPress={onShareLink}>
                  <Link2 color={colors.accent} size={16} />
                  <Text style={styles.linkText}>Share invite link</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>
              People {list ? `(${list.length})` : ""}
            </Text>
          </View>
        }
        ListEmptyComponent={
          list === null
            ? <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
            : <View style={styles.centered}><Text style={styles.dim}>No collaborators yet.</Text></View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Users color={colors.textDim} size={18} />
              </View>
            )}
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name ?? (item.username ? `@${item.username}` : "Pending invite link")}
              </Text>
              <Text style={styles.dim} numberOfLines={1}>
                {item.role === "viewer" ? "Viewer" : "Editor"}
                {item.status !== "accepted" ? " · pending" : ""}
              </Text>
            </View>
            {isOwner ? (
              <Pressable hitSlop={8} onPress={() => onRemove(item)}>
                <X color={colors.danger} size={20} />
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { padding: 24, alignItems: "center", justifyContent: "center" },
    dim: { color: c.textDim, fontSize: 13 },
    header: { padding: 16, gap: 14 },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surface, borderRadius: 12, padding: 14 },
    toggleText: { flex: 1, paddingRight: 12, gap: 2 },
    toggleTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
    inviteBox: { backgroundColor: c.surface, borderRadius: 12, padding: 14, gap: 12 },
    roleSeg: { flexDirection: "row", backgroundColor: c.surfaceAlt, borderRadius: 10, padding: 3, gap: 3 },
    roleItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
    roleText: { fontSize: 13, fontWeight: "600" },
    inviteRow: { flexDirection: "row", gap: 8 },
    input: { flex: 1, backgroundColor: c.surfaceAlt, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
    inviteBtn: { backgroundColor: c.accentStrong, borderRadius: 10, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
    inviteBtnText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    btnDisabled: { opacity: 0.45 },
    linkBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    linkText: { color: c.accent, fontSize: 14, fontWeight: "600" },
    sectionTitle: { color: c.textFaint, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceAlt },
    avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
    meta: { flex: 1 },
    name: { color: c.text, fontSize: 15, fontWeight: "500" },
  });
}
