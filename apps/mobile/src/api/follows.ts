import { asRecord, asString, unwrapList } from "@sunoflow/core";
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

function mapFollowedUser(raw: unknown): FollowedUser | null {
  const u = asRecord(raw);
  const id = u ? asString(u.id) : null;
  const username = u ? asString(u.username) : null;
  if (!u || !id || !username) return null;

  const name = asString(u.name);
  const displayName = name?.trim() ? name : username;

  const image = asString(u.image) ?? asString(u.avatarUrl) ?? undefined;

  return { id, username, displayName, image };
}

/** List the users the authenticated user follows (newest-followed first). */
export async function fetchFollowing(): Promise<FollowedUser[]> {
  const res = await apiGet<unknown>(`/api/users/me/following`);
  return unwrapList(res, "users", mapFollowedUser);
}
