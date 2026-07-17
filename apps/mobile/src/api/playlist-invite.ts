import { asNumber, asRecord, asString } from "@sunoflow/core";
import { apiGet, apiPost } from "./client";

// Playlist-collaboration invites. A user opens an invite link carrying a token;
// GET resolves the invite (public, no auth) so we can preview the playlist, and
// POST accepts it (auth) and returns the playlist id to navigate into.
//
// The JSON envelope is `unknown` at this boundary — the server contract is
// re-declared on the web side, not yet shared via packages/core — so every read
// is shape-guarded and degrades defensively rather than throwing on a bad shape.

export interface InviteInfo {
  id: string;
  status: string;
  expiresAt: string | null;
  playlist: {
    id: string;
    name: string;
    description: string | null;
    songCount: number;
    ownerName: string | null;
  };
}

interface InviteResponse {
  invite?: unknown;
}

export async function fetchInviteInfo(token: string): Promise<InviteInfo> {
  const res = await apiGet<InviteResponse>(`/api/playlists/invite/${token}`);
  const invite = asRecord(res?.invite) ?? {};
  const playlist = asRecord(invite.playlist) ?? {};
  const count = asRecord(playlist._count) ?? {};
  const user = asRecord(playlist.user) ?? {};

  return {
    id: asString(invite.id, ""),
    status: asString(invite.status, ""),
    expiresAt: asString(invite.expiresAt),
    playlist: {
      id: asString(playlist.id, ""),
      name: asString(playlist.name, ""),
      description: asString(playlist.description),
      songCount: asNumber(count.songs, 0),
      ownerName: asString(user.name),
    },
  };
}

interface AcceptResponse {
  playlistId?: unknown;
}

export async function acceptInvite(token: string): Promise<{ playlistId: string }> {
  const res = await apiPost<AcceptResponse>(`/api/playlists/invite/${token}`, {});
  return { playlistId: asString(res?.playlistId, "") };
}
