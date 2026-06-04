import { apiGet } from "./client";

// People-you-follow talks to the existing web endpoint (authRoute → resolveUser
// accepts the bearer sk- key). GET /api/users/me/following returns
// { users: [...], pagination } where each user has id, username, name, image,
// avatarUrl, followersCount. We map defensively — server shape may drift.

export interface FollowedUser {
  id: string;
  username: string;
  displayName: string;
  image?: string;
}

interface FollowingResponse {
  users?: unknown[];
}

function mapFollowedUser(raw: unknown): FollowedUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const id = typeof u.id === "string" ? u.id : null;
  const username = typeof u.username === "string" ? u.username : null;
  if (!id || !username) return null;

  const name = typeof u.name === "string" && u.name.trim().length > 0 ? u.name : null;
  const displayName = name ?? username;

  const image =
    typeof u.image === "string" && u.image.length > 0
      ? u.image
      : typeof u.avatarUrl === "string" && u.avatarUrl.length > 0
        ? u.avatarUrl
        : undefined;

  return { id, username, displayName, image };
}

/** List the users the authenticated user follows (newest-followed first). */
export async function fetchFollowing(): Promise<FollowedUser[]> {
  const res = await apiGet<FollowingResponse>(`/api/users/me/following`);
  return (Array.isArray(res?.users) ? res.users : [])
    .map(mapFollowedUser)
    .filter((u): u is FollowedUser => u !== null);
}
