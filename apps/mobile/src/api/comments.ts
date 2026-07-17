import { asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet, apiPost } from "./client";

// Comments on a public song. Shapes confirmed from the web handler:
// GET  /api/songs/[id]/comments → { comments: CommentEntry[], pagination }
// POST /api/songs/[id]/comments → CommentEntry  (body field is `body`)
// CommentEntry: { id, body, createdAt, user: { id, name, image } }.
// Mapped DEFENSIVELY at the boundary — unknown/missing fields degrade, never throw.

export interface Comment {
  id: string;
  body: string;
  author: string;
  createdAt: string | null;
}

/** Defensive map of one raw API comment → Comment. Returns null if unusable. */
function mapApiComment(raw: unknown): Comment | null {
  const c = asRecord(raw);
  if (!c) return null;
  const body = asString(c.body) ?? asString(c.text);
  if (!body) return null;
  const author =
    asString(asRecord(c.user)?.name) ??
    asString(c.author) ??
    asString(c.username) ??
    "Anonymous";
  const createdAt = asString(c.createdAt);
  return {
    id: asString(c.id) ?? `${author}:${createdAt ?? Math.random()}`,
    body,
    author,
    createdAt,
  };
}

export async function fetchComments(songId: string): Promise<Comment[]> {
  const res = await apiGet<unknown>(`/api/songs/${encodeURIComponent(songId)}/comments`);
  return unwrapList(res, "comments", mapApiComment);
}

export async function addComment(songId: string, text: string): Promise<Comment | null> {
  const raw = await apiPost<unknown>(`/api/songs/${encodeURIComponent(songId)}/comments`, { body: text });
  return mapApiComment(raw);
}
