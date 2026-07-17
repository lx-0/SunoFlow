import { asNumber, asRecord, asString, asStringArray } from "@sunoflow/core";
import { apiGet, apiPatch } from "@/api/client";

// Profile data for the "My Profile" screen. Bearer endpoints, raw JSON (no
// envelope). Every read is shape-guarded — null/odd fields degrade to safe
// defaults so the screen never throws on backend drift.
//   GET   /api/profile        -> profile object (name/bio/username/avatarUrl may be null)
//   PATCH /api/profile        -> updated subset; send only changed fields
//   GET   /api/profile/stats  -> headline counts + membership timestamps
//   GET   /api/streaks        -> { streak: { currentStreak, longestStreak, lastActiveDate } }
//   GET   /api/milestones     -> { milestones: [{ type, earnedAt, label, description, emoji }] }

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  featuredSongId: string | null;
  preferredGenres: string[];
}

export interface ProfilePreferences {
  defaultStyle: string | null;
  preferredGenres: string[];
}

export interface ProfileStats {
  totalSongs: number;
  totalFavorites: number;
  totalPlaylists: number;
  totalTemplates: number;
  followersCount: number;
  followingCount: number;
  memberSince: string;
  lastLoginAt: string | null;
}

export interface Milestone {
  type: string;
  earnedAt: string;
  label: string;
  description: string;
  emoji: string;
}

/** Count fields arrive as integers; truncate defensively in case of drift. */
function toInt(v: unknown): number {
  return Math.trunc(asNumber(v, 0));
}

export async function fetchProfile(): Promise<Profile> {
  const raw = asRecord(await apiGet<unknown>("/api/profile")) ?? {};
  return {
    id: asString(raw.id, ""),
    email: asString(raw.email, ""),
    name: asString(raw.name),
    bio: asString(raw.bio),
    username: asString(raw.username),
    avatarUrl: asString(raw.avatarUrl),
    bannerUrl: asString(raw.bannerUrl),
    featuredSongId: asString(raw.featuredSongId),
    preferredGenres: asStringArray(raw.preferredGenres),
  };
}

export async function updateProfile(input: {
  name?: string;
  bio?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  featuredSongId?: string | null;
}): Promise<void> {
  await apiPatch<unknown>("/api/profile", input);
}

/** Set (or clear) the song featured on your public profile. */
export async function setFeaturedSong(songId: string | null): Promise<void> {
  await apiPatch<unknown>("/api/profile", { featuredSongId: songId });
}

// GET/PATCH /api/profile/preferences return the data object directly (no
// envelope): { defaultStyle, preferredGenres }. defaultStyle drives the style
// auto-applied on the Generate screen.
export async function fetchPreferences(): Promise<ProfilePreferences> {
  const raw = asRecord(await apiGet<unknown>("/api/profile/preferences")) ?? {};
  return {
    defaultStyle: asString(raw.defaultStyle),
    preferredGenres: asStringArray(raw.preferredGenres),
  };
}

export async function updatePreferences(patch: {
  defaultStyle?: string | null;
  preferredGenres?: string[];
}): Promise<void> {
  await apiPatch<unknown>("/api/profile/preferences", patch);
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const raw = asRecord(await apiGet<unknown>("/api/profile/stats")) ?? {};
  return {
    totalSongs: toInt(raw.totalSongs),
    totalFavorites: toInt(raw.totalFavorites),
    totalPlaylists: toInt(raw.totalPlaylists),
    totalTemplates: toInt(raw.totalTemplates),
    followersCount: toInt(raw.followersCount),
    followingCount: toInt(raw.followingCount),
    memberSince: asString(raw.memberSince, ""),
    lastLoginAt: asString(raw.lastLoginAt),
  };
}

export async function fetchStreak(): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}> {
  const raw = asRecord(await apiGet<unknown>("/api/streaks")) ?? {};
  const s = asRecord(raw.streak) ?? {};
  return {
    currentStreak: toInt(s.currentStreak),
    longestStreak: toInt(s.longestStreak),
    lastActiveDate: asString(s.lastActiveDate),
  };
}

export async function fetchMilestones(): Promise<Milestone[]> {
  const raw = asRecord(await apiGet<unknown>("/api/milestones")) ?? {};
  const list = Array.isArray(raw.milestones) ? raw.milestones : [];
  return list.map((m) => {
    const r = asRecord(m) ?? {};
    return {
      type: asString(r.type, ""),
      earnedAt: asString(r.earnedAt, ""),
      label: asString(r.label, ""),
      description: asString(r.description, ""),
      emoji: asString(r.emoji, ""),
    };
  });
}
