import { apiGet, apiPost, apiPatch, apiDelete, API_BASE_URL } from "./client";

// Playlist collaboration (owner side): list collaborators, toggle collaborative
// mode, invite by username, mint a shareable invite link, remove a collaborator.
// Mirrors the web PlaylistCollaboratorsPanel against the same REST endpoints.
// NOTE: both invite paths require collaborative mode to be ON (server-enforced).

export interface Collaborator {
  id: string;
  status: string; // "accepted" | "pending"
  role: string; // "editor" | "viewer"
  userId: string | null;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export interface PlaylistCollabMeta {
  name: string;
  isCollaborative: boolean;
  isOwner: boolean;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/** GET /api/playlists/[id] → name + isCollaborative + isOwner (all scalars come back via Prisma include). */
export async function fetchPlaylistCollabMeta(playlistId: string): Promise<PlaylistCollabMeta> {
  const res = await apiGet<unknown>(`/api/playlists/${playlistId}`);
  const root = rec(res);
  const pl = rec(root.playlist);
  return {
    name: str(pl.name) ?? "Playlist",
    isCollaborative: pl.isCollaborative === true,
    isOwner: root.isOwner === true,
  };
}

/** GET /api/playlists/[id]/collaborators → { collaborators: [{ ...row, user }] }. */
export async function fetchCollaborators(playlistId: string): Promise<Collaborator[]> {
  const res = await apiGet<{ collaborators?: unknown[] }>(`/api/playlists/${playlistId}/collaborators`);
  const list = Array.isArray(res.collaborators) ? res.collaborators : [];
  return list.map((raw) => {
    const r = rec(raw);
    const u = rec(r.user);
    return {
      id: str(r.id) ?? "",
      status: str(r.status) ?? "pending",
      role: str(r.role) ?? "editor",
      userId: str(r.userId),
      name: str(u.name),
      username: str(u.username),
      avatarUrl: str(u.avatarUrl) ?? str(u.image),
    };
  }).filter((c) => c.id);
}

/** PATCH /api/playlists/[id]/collaborative → flips the flag; returns the NEW value. */
export async function toggleCollaborative(playlistId: string): Promise<boolean> {
  const res = await apiPatch<{ isCollaborative?: boolean }>(`/api/playlists/${playlistId}/collaborative`, {});
  return res?.isCollaborative === true;
}

/** POST /api/playlists/[id]/collaborators { username, role } — invites an existing user. */
export async function inviteCollaborator(playlistId: string, username: string, role: "editor" | "viewer"): Promise<void> {
  await apiPost(`/api/playlists/${playlistId}/collaborators`, { username: username.trim(), role });
}

/** POST /api/playlists/[id]/collaborators { role } (no username) → mints an invite token; returns the shareable URL. */
export async function createInviteLink(playlistId: string, role: "editor" | "viewer"): Promise<string> {
  const res = await apiPost<{ collaborator?: { inviteToken?: string } }>(
    `/api/playlists/${playlistId}/collaborators`,
    { role },
  );
  const token = res?.collaborator?.inviteToken;
  if (!token) throw new Error("No invite token returned");
  return `${API_BASE_URL}/playlists/invite/${token}`;
}

/** DELETE /api/playlists/[id]/collaborators/[collaboratorId]. */
export async function removeCollaborator(playlistId: string, collaboratorId: string): Promise<void> {
  await apiDelete(`/api/playlists/${playlistId}/collaborators/${collaboratorId}`);
}
