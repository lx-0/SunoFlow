import { asBool, asRecord, asString, unwrapList } from "@sunoflow/core";
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

function mapFeed(raw: unknown): RssFeed | null {
  const f = asRecord(raw);
  const id = f ? asString(f.id) : null;
  const url = f ? asString(f.url) : null;
  if (!f || !id || !url) return null;
  return {
    id,
    url,
    title: asString(f.title),
    autoGenerate: asBool(f.autoGenerate),
    createdAt: asString(f.createdAt),
  };
}

/** List the user's RSS feeds. */
export async function fetchRssFeeds(): Promise<RssFeed[]> {
  const res = await apiGet<unknown>(`/api/rss/feeds`);
  return unwrapList(res, "feeds", mapFeed);
}

/** Add an RSS feed by URL. */
export async function addRssFeed(url: string): Promise<void> {
  await apiPost("/api/rss/feeds", { url: url.trim() });
}

/** Delete an RSS feed (id is passed as a query param). */
export async function deleteRssFeed(id: string): Promise<void> {
  await apiDelete(`/api/rss/feeds?id=${encodeURIComponent(id)}`);
}
