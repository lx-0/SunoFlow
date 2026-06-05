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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toStrOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toInt(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : 0;
}

function toStrArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export async function fetchProfile(): Promise<Profile> {
  const raw = asRecord(await apiGet<unknown>("/api/profile"));
  return {
    id: toStr(raw.id),
    email: toStr(raw.email),
    name: toStrOrNull(raw.name),
    bio: toStrOrNull(raw.bio),
    username: toStrOrNull(raw.username),
    preferredGenres: toStrArray(raw.preferredGenres),
  };
}

export async function updateProfile(input: {
  name?: string;
  bio?: string | null;
  username?: string | null;
}): Promise<void> {
  await apiPatch<unknown>("/api/profile", input);
}

// GET/PATCH /api/profile/preferences return the data object directly (no
// envelope): { defaultStyle, preferredGenres }. defaultStyle drives the style
// auto-applied on the Generate screen.
export async function fetchPreferences(): Promise<ProfilePreferences> {
  const raw = asRecord(await apiGet<unknown>("/api/profile/preferences"));
  return {
    defaultStyle: toStrOrNull(raw.defaultStyle),
    preferredGenres: toStrArray(raw.preferredGenres),
  };
}

export async function updatePreferences(patch: {
  defaultStyle?: string | null;
  preferredGenres?: string[];
}): Promise<void> {
  await apiPatch<unknown>("/api/profile/preferences", patch);
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const raw = asRecord(await apiGet<unknown>("/api/profile/stats"));
  return {
    totalSongs: toInt(raw.totalSongs),
    totalFavorites: toInt(raw.totalFavorites),
    totalPlaylists: toInt(raw.totalPlaylists),
    totalTemplates: toInt(raw.totalTemplates),
    followersCount: toInt(raw.followersCount),
    followingCount: toInt(raw.followingCount),
    memberSince: toStr(raw.memberSince),
    lastLoginAt: toStrOrNull(raw.lastLoginAt),
  };
}

export async function fetchStreak(): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}> {
  const raw = asRecord(await apiGet<unknown>("/api/streaks"));
  const s = asRecord(raw.streak);
  return {
    currentStreak: toInt(s.currentStreak),
    longestStreak: toInt(s.longestStreak),
    lastActiveDate: toStrOrNull(s.lastActiveDate),
  };
}

export async function fetchMilestones(): Promise<Milestone[]> {
  const raw = asRecord(await apiGet<unknown>("/api/milestones"));
  const list = Array.isArray(raw.milestones) ? raw.milestones : [];
  return list.map((m) => {
    const r = asRecord(m);
    return {
      type: toStr(r.type),
      earnedAt: toStr(r.earnedAt),
      label: toStr(r.label),
      description: toStr(r.description),
      emoji: toStr(r.emoji),
    };
  });
}
