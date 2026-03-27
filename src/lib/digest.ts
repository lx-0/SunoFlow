import { prisma } from "@/lib/prisma";
import { fetchFeed } from "@/lib/rss";

export interface DigestItem {
  source: "rss";
  title: string;
  link?: string;
  mood: string;
  topics: string[];
  suggestedPrompt: string;
  feedTitle?: string;
}

const MAX_DIGESTS_PER_USER = 10;
const MAX_FEEDS = 5;
const MAX_ITEMS_PER_FEED = 3;
const MAX_TOTAL_ITEMS = 15;
const DIGEST_ITEMS_MIN = 5;
const DIGEST_ITEMS_MAX = 8;

function buildPrompt(title: string, mood: string, topics: string[]): string {
  const parts: string[] = [];
  if (mood && mood !== "neutral") parts.push(`${mood} vibe`);
  if (topics.length > 0) parts.push(topics.slice(0, 3).join(", "));
  if (title && title.length > 5 && title.length < 80) parts.push(`"${title}"`);
  return parts.length > 0 ? parts.join(" — ") : title.slice(0, 100);
}

export async function generateDigest(userId: string) {
  // Fetch user RSS subscriptions (up to MAX_FEEDS active)
  const feeds = await prisma.rssFeedSubscription.findMany({
    where: { userId },
    take: MAX_FEEDS,
    orderBy: { createdAt: "asc" },
    select: { url: true, title: true },
  });

  if (feeds.length === 0) {
    return null;
  }

  // Fetch and collect items from all feeds
  const allItems: DigestItem[] = [];
  const seenLinks = new Set<string>();

  for (const feed of feeds) {
    const result = await fetchFeed(feed.url);
    if (result.error || result.items.length === 0) continue;

    const feedTitle = feed.title ?? result.feedTitle;
    const picked = result.items.slice(0, MAX_ITEMS_PER_FEED);
    for (const item of picked) {
      if (allItems.length >= MAX_TOTAL_ITEMS) break;
      if (item.link && seenLinks.has(item.link)) continue;
      if (item.link) seenLinks.add(item.link);

      const mood = item.mood ?? "neutral";
      const topics = item.topics ?? [];
      allItems.push({
        source: "rss",
        title: item.title,
        link: item.link,
        mood,
        topics,
        suggestedPrompt: buildPrompt(item.title, mood, topics),
        feedTitle,
      });
    }
  }

  if (allItems.length === 0) return null;

  // Select DIGEST_ITEMS_MIN–DIGEST_ITEMS_MAX items preferring diverse moods
  const selected: DigestItem[] = [];
  const usedMoods = new Set<string>();

  // First pass: one item per mood
  for (const item of allItems) {
    if (selected.length >= DIGEST_ITEMS_MAX) break;
    if (!usedMoods.has(item.mood)) {
      selected.push(item);
      usedMoods.add(item.mood);
    }
  }

  // Second pass: fill up to min/max if needed
  for (const item of allItems) {
    if (selected.length >= DIGEST_ITEMS_MAX) break;
    if (!selected.includes(item)) {
      selected.push(item);
    }
  }

  // Ensure at least DIGEST_ITEMS_MIN
  if (selected.length < DIGEST_ITEMS_MIN && allItems.length >= DIGEST_ITEMS_MIN) {
    for (const item of allItems) {
      if (selected.length >= DIGEST_ITEMS_MIN) break;
      if (!selected.includes(item)) selected.push(item);
    }
  }

  const now = new Date();
  const title = `Your Daily Digest — ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  const digest = await prisma.inspirationDigest.create({
    data: {
      userId,
      title,
      items: selected as object[],
    },
  });

  // Prune oldest digests, keep latest MAX_DIGESTS_PER_USER
  const oldest = await prisma.inspirationDigest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_DIGESTS_PER_USER,
    select: { id: true },
  });
  if (oldest.length > 0) {
    await prisma.inspirationDigest.deleteMany({
      where: { id: { in: oldest.map((d) => d.id) } },
    });
  }

  return { ...digest, items: selected };
}
