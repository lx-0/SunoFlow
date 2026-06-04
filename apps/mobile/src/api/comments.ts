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

interface CommentListResponse {
  comments?: unknown[];
}

/** Defensive map of one raw API comment → Comment. Returns null if unusable. */
function mapApiComment(raw: unknown): Comment | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const body = typeof c.body === "string" ? c.body : typeof c.text === "string" ? c.text : "";
  if (!body) return null;
  const user = c.user && typeof c.user === "object" ? (c.user as Record<string, unknown>) : null;
  const author =
    (user && typeof user.name === "string" && user.name) ||
    (typeof c.author === "string" && c.author) ||
    (typeof c.username === "string" && c.username) ||
    "Anonymous";
  const createdAt = typeof c.createdAt === "string" ? c.createdAt : null;
  return {
    id: typeof c.id === "string" ? c.id : `${author}:${createdAt ?? Math.random()}`,
    body,
    author,
    createdAt,
  };
}

export async function fetchComments(songId: string): Promise<Comment[]> {
  const res = await apiGet<CommentListResponse>(`/api/songs/${encodeURIComponent(songId)}/comments`);
  return (Array.isArray(res.comments) ? res.comments : [])
    .map(mapApiComment)
    .filter((c): c is Comment => c !== null);
}

export async function addComment(songId: string, text: string): Promise<Comment | null> {
  const raw = await apiPost<unknown>(`/api/songs/${encodeURIComponent(songId)}/comments`, { body: text });
  return mapApiComment(raw);
}
