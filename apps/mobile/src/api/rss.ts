import { apiGet, apiPost, apiDelete } from "./client";

// RSS feeds talk to the existing web endpoint (bearer sk- key auth). They power
// the Inspire "Today's Picks" feature — without at least one feed, Inspire is
// empty. Endpoints:
//   GET    /api/rss/feeds          → { feeds: RssFeed[] }
//   POST   /api/rss/feeds  { url } → the created feed
//   DELETE /api/rss/feeds?id=<id>  → (id is a QUERY PARAM, not a body)
// `title` may be null until the feed is fetched. Map defensively — never throw
// on shape.

export interface RssFeed {
  id: string;
  url: string;
  title: string | null;
  autoGenerate: boolean;
  createdAt: string | null;
}

interface RssFeedsResponse {
  feeds?: unknown[];
}

function mapFeed(raw: unknown): RssFeed | null {
  if (typeof raw !== "object" || raw === null) return null;
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== "string" || typeof f.url !== "string") return null;
  return {
    id: f.id,
    url: f.url,
    title: typeof f.title === "string" ? f.title : null,
    autoGenerate: f.autoGenerate === true,
    createdAt: typeof f.createdAt === "string" ? f.createdAt : null,
  };
}

/** List the user's RSS feeds. */
export async function fetchRssFeeds(): Promise<RssFeed[]> {
  const res = await apiGet<RssFeedsResponse>(`/api/rss/feeds`);
  return (Array.isArray(res?.feeds) ? res.feeds : [])
    .map(mapFeed)
    .filter((f): f is RssFeed => f !== null);
}

/** Add an RSS feed by URL. */
export async function addRssFeed(url: string): Promise<void> {
  await apiPost("/api/rss/feeds", { url: url.trim() });
}

/** Delete an RSS feed (id is passed as a query param). */
export async function deleteRssFeed(id: string): Promise<void> {
  await apiDelete(`/api/rss/feeds?id=${encodeURIComponent(id)}`);
}
