import { asBool, asNumber, asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet, apiPost, apiDelete } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Public user profiles + follow toggle. Talks to the REAL backend (bearer-authed).
// Shapes confirmed from the web routes (/api/u/[username], /api/u/[username]/songs,
// /api/users/[id]/follow); all reads are mapped DEFENSIVELY at the data boundary so
// unknown/missing fields degrade rather than crash. Public song rows (albumArtUrl,
// creatorDisplayName) are handled by mapApiSong's aliases directly.

export interface UserProfile {
  id: string;
  /** Best display name: profile `name`, falling back to the username. */
  displayName: string;
  username: string;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  songsCount: number;
  isFollowing: boolean;
}

/** Defensive map of the raw profile payload → UserProfile. */
function mapProfile(raw: unknown, fallbackUsername: string): UserProfile {
  const p = asRecord(raw) ?? {};
  const username = asString(p.username) ?? fallbackUsername;
  const name = asString(p.name);
  return {
    id: asString(p.id) ?? "",
    displayName: name ?? username,
    username,
    bio: asString(p.bio),
    followersCount: asNumber(p.followersCount, 0),
    followingCount: asNumber(p.followingCount, 0),
    songsCount: asNumber(p.publicSongsCount, 0),
    isFollowing: asBool(p.isFollowing),
  };
}

export async function fetchUserProfile(username: string): Promise<UserProfile> {
  const raw = await apiGet<unknown>(`/api/u/${encodeURIComponent(username)}`);
  return mapProfile(raw, username);
}

export async function fetchUserSongs(username: string): Promise<Song[]> {
  const raw = await apiGet<unknown>(`/api/u/${encodeURIComponent(username)}/songs`);
  return unwrapList(raw, "songs", mapApiSong);
}

/** A user's publicly-liked songs. Same `{ songs: [...] }` shape + mapping as fetchUserSongs. */
export async function fetchUserLikedSongs(username: string): Promise<Song[]> {
  const raw = await apiGet<unknown>(`/api/u/${encodeURIComponent(username)}/liked-songs`);
  return unwrapList(raw, "songs", mapApiSong);
}

export interface UserPlaylist {
  id: string;
  name: string;
  songCount: number;
}

/** Defensive map of the raw `{ playlists: [...] }` payload → UserPlaylist[]. */
export async function fetchUserPlaylists(username: string): Promise<UserPlaylist[]> {
  const raw = await apiGet<unknown>(`/api/u/${encodeURIComponent(username)}/playlists`);
  return unwrapList(raw, "playlists", (entry): UserPlaylist | null => {
    const p = asRecord(entry);
    const id = p ? asString(p.id) : null;
    if (!p || !id) return null;
    return {
      id,
      name: asString(p.name) ?? "Untitled playlist",
      songCount: asNumber(p.songCount, 0),
    };
  });
}

export async function followUser(userId: string): Promise<void> {
  await apiPost<unknown>(`/api/users/${encodeURIComponent(userId)}/follow`, {});
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiDelete(`/api/users/${encodeURIComponent(userId)}/follow`);
}
