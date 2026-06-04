import { apiGet, apiPost, apiDelete } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Public user profiles + follow toggle. Talks to the REAL backend (bearer-authed).
// Shapes confirmed from the web routes (/api/u/[username], /api/u/[username]/songs,
// /api/users/[id]/follow); all reads are mapped DEFENSIVELY at the data boundary so
// unknown/missing fields degrade rather than crash.

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

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Defensive map of the raw profile payload → UserProfile. */
function mapProfile(raw: unknown, fallbackUsername: string): UserProfile {
  const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const username = typeof p.username === "string" && p.username ? p.username : fallbackUsername;
  const name = typeof p.name === "string" && p.name ? p.name : null;
  return {
    id: typeof p.id === "string" ? p.id : "",
    displayName: name ?? username,
    username,
    bio: typeof p.bio === "string" && p.bio ? p.bio : null,
    followersCount: num(p.followersCount),
    followingCount: num(p.followingCount),
    songsCount: num(p.publicSongsCount),
    isFollowing: p.isFollowing === true,
  };
}

export async function fetchUserProfile(username: string): Promise<UserProfile> {
  const raw = await apiGet<unknown>(`/api/u/${encodeURIComponent(username)}`);
  return mapProfile(raw, username);
}

export async function fetchUserSongs(username: string): Promise<Song[]> {
  const raw = await apiGet<unknown>(`/api/u/${encodeURIComponent(username)}/songs`);
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).songs)
      ? ((raw as Record<string, unknown>).songs as unknown[])
      : [];
  return list
    .map((entry) => {
      const mapped = mapApiSong(entry);
      if (mapped) return mapped;
      // Public songs may carry artwork as `albumArtUrl` instead of `imageUrl`;
      // try a fallback map that supplies imageUrl from it before giving up.
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (typeof e.albumArtUrl === "string" && !e.imageUrl) {
          return mapApiSong({ ...e, imageUrl: e.albumArtUrl });
        }
      }
      return null;
    })
    .filter((s): s is Song => s !== null);
}

/** A user's publicly-liked songs. Same `{ songs: [...] }` shape + mapping as fetchUserSongs. */
export async function fetchUserLikedSongs(username: string): Promise<Song[]> {
  const raw = await apiGet<unknown>(`/api/u/${encodeURIComponent(username)}/liked-songs`);
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).songs)
      ? ((raw as Record<string, unknown>).songs as unknown[])
      : [];
  return list
    .map((entry) => {
      const mapped = mapApiSong(entry);
      if (mapped) return mapped;
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (typeof e.albumArtUrl === "string" && !e.imageUrl) {
          return mapApiSong({ ...e, imageUrl: e.albumArtUrl });
        }
      }
      return null;
    })
    .filter((s): s is Song => s !== null);
}

export interface UserPlaylist {
  id: string;
  name: string;
  songCount: number;
}

/** Defensive map of the raw `{ playlists: [...] }` payload → UserPlaylist[]. */
export async function fetchUserPlaylists(username: string): Promise<UserPlaylist[]> {
  const raw = await apiGet<unknown>(`/api/u/${encodeURIComponent(username)}/playlists`);
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).playlists)
      ? ((raw as Record<string, unknown>).playlists as unknown[])
      : [];
  return list
    .map((entry): UserPlaylist | null => {
      if (!entry || typeof entry !== "object") return null;
      const p = entry as Record<string, unknown>;
      if (typeof p.id !== "string" || !p.id) return null;
      return {
        id: p.id,
        name: typeof p.name === "string" && p.name ? p.name : "Untitled playlist",
        songCount: num(p.songCount),
      };
    })
    .filter((p): p is UserPlaylist => p !== null);
}

export async function followUser(userId: string): Promise<void> {
  await apiPost<unknown>(`/api/users/${encodeURIComponent(userId)}/follow`, {});
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiDelete(`/api/users/${encodeURIComponent(userId)}/follow`);
}
