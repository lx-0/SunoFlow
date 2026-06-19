import { prisma } from "@/lib/prisma";
import { fetchFeed } from "./index";
import { generateSong, resolveUserApiKeyWithMode } from "@/lib/sunoapi";
import { checkCredits, deductCredits } from "@/lib/credits";
import { logger } from "@/lib/logger";
import { generateCoverArtVariants } from "@/lib/cover-art-generator";
import { createNotification } from "@/lib/notifications";
import { buildSimplePromptFromItem } from "@/lib/prompts";
import { generateLyrics as generateSongLyrics } from "@/lib/lyrics";

const MAX_AUTO_PER_USER = 10;
// V5_5 (default) caps the custom-mode prompt — i.e. the lyrics — at 5000 chars.
const SONG_LYRICS_MAX = 4900;

export interface AutoGenerateResult {
  processed: number;
  generated: number;
}

interface AutoFeed {
  id: string;
  userId: string;
  url: string;
  title: string | null;
  lastCheckedAt: Date | null;
}

function groupByUser(feeds: AutoFeed[]): Map<string, AutoFeed[]> {
  const map = new Map<string, AutoFeed[]>();
  for (const feed of feeds) {
    const list = map.get(feed.userId) ?? [];
    list.push(feed);
    map.set(feed.userId, list);
  }
  return map;
}

async function hasReachedDailyLimit(
  feedId: string,
  todayStart: Date,
): Promise<boolean> {
  const count = await prisma.song.count({
    where: {
      rssFeedSubscriptionId: feedId,
      source: "auto",
      createdAt: { gte: todayStart },
    },
  });
  return count >= 1;
}

// Below this an item's body is a teaser/caption (e.g. a tagesschau /video page),
// not a real article — a poor basis for a full song. Prefer real articles.
const MIN_ARTICLE_BODY = 600;

async function findNewItem(
  feed: AutoFeed,
): Promise<{ title: string; description: string; content?: string; mood?: string; topics?: string[]; suggestedStyle?: string } | null> {
  const result = await fetchFeed(feed.url);
  if (result.error || result.items.length === 0) return null;

  const lastChecked = feed.lastCheckedAt;
  const candidates = lastChecked
    ? result.items.filter((item) => {
        if (!item.pubDate) return false;
        const pubDate = new Date(item.pubDate);
        return !isNaN(pubDate.getTime()) && pubDate > lastChecked;
      })
    : result.items.slice(0, 5);

  if (candidates.length === 0) return null;

  // Prefer the newest candidate that actually has a full article body, so we
  // never auto-generate a song from a one-sentence video caption or teaser.
  const withArticle = candidates.find(
    (item) => (item.content || "").length >= MIN_ARTICLE_BODY,
  );
  return withArticle ?? candidates[0] ?? null;
}

async function generateFromFeedItem(
  userId: string,
  feed: AutoFeed,
  item: { title: string; description: string; content?: string; mood?: string; topics?: string[]; suggestedStyle?: string },
  apiKey: string | undefined,
  usingPersonalKey: boolean,
  now: Date,
): Promise<boolean> {
  const { prompt: fallbackPrompt, style } = buildSimplePromptFromItem(item);
  if (!fallbackPrompt) return false;

  // Turn the WHOLE article into a complete, structured song via the LLM, then
  // sing THOSE lyrics: generateSong runs in custom mode here (title is set), so
  // its `prompt` is the lyrics text — not a style description. Fall back to the
  // short description prompt if the LLM step is unavailable (rate limit / error)
  // so auto-generation still produces a song.
  let prompt = fallbackPrompt;
  let songStyle = style;
  let songTitle = item.title;
  const basis = [item.title?.trim(), (item.content || item.description || "").trim()]
    .filter(Boolean)
    .join("\n\n")
    .trim();
  if (basis.length > 40) {
    const lyricsResult = await generateSongLyrics(userId, basis);
    if (lyricsResult.ok && lyricsResult.lyrics.trim().length > 0) {
      prompt = lyricsResult.lyrics.trim().slice(0, SONG_LYRICS_MAX);
      // Use the LLM's title + style (better than the heuristic) when present.
      if (lyricsResult.style.trim()) songStyle = lyricsResult.style.trim();
      if (lyricsResult.title.trim()) songTitle = lyricsResult.title.trim();
    } else {
      logger.info(
        { feedId: feed.id, userId, reason: lyricsResult.ok ? "empty" : lyricsResult.code },
        "feed-auto-generate: LLM lyrics unavailable, falling back to description prompt",
      );
    }
  }

  if (!usingPersonalKey) {
    const recheck = await checkCredits(userId, "generate");
    if (!recheck.ok) {
      logger.info({ userId }, "feed-auto-generate: insufficient credits for next generation, stopping user");
      return false;
    }
  }

  logger.info(
    { feedId: feed.id, userId, prompt: prompt.slice(0, 80) },
    "feed-auto-generate: starting song generation",
  );

  let song;
  try {
    const genResult = await generateSong(
      prompt,
      { style: songStyle || undefined, title: songTitle?.slice(0, 100) || undefined },
      apiKey ?? undefined,
    );

    song = await prisma.song.create({
      data: {
        userId,
        sunoJobId: genResult.taskId,
        prompt,
        tags: songStyle || null,
        title: songTitle?.slice(0, 200) || null,
        generationStatus: "pending",
        source: "auto",
        rssFeedSubscriptionId: feed.id,
      },
    });

    try {
      const [placeholderVariant] = generateCoverArtVariants({
        songId: song.id,
        title: songTitle?.slice(0, 100),
        tags: songStyle,
      });
      prisma.song
        .update({ where: { id: song.id }, data: { imageUrl: placeholderVariant.dataUrl } })
        .catch(() => {});
    } catch {
      // Non-critical
    }
  } catch (genErr) {
    logger.error(
      { feedId: feed.id, userId, genErr },
      "feed-auto-generate: generation API call failed",
    );
    await prisma.rssFeedSubscription.update({
      where: { id: feed.id },
      data: { lastCheckedAt: now },
    });
    return false;
  }

  if (!usingPersonalKey) {
    await deductCredits(userId, "generate", {
      songId: song.id,
      description: `Auto-generated from feed: ${feed.title ?? feed.url}`,
    }).catch(() => {});
  }

  await createNotification({
    userId,
    type: "generation_complete",
    title: "Auto-generation started",
    message: `Generating a song from "${feed.title ?? "RSS feed"}" — inspired by "${item.title?.slice(0, 80) ?? "a new item"}"`,
    songId: song.id,
  }).catch(() => {});

  await prisma.rssFeedSubscription.update({
    where: { id: feed.id },
    data: { lastCheckedAt: now },
  });

  return true;
}

export async function processAutoGenerateFeeds(): Promise<AutoGenerateResult> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const autoFeeds = await prisma.rssFeedSubscription.findMany({
    where: { autoGenerate: true },
    select: {
      id: true,
      userId: true,
      url: true,
      title: true,
      lastCheckedAt: true,
    },
    orderBy: { userId: "asc" },
  });

  if (autoFeeds.length === 0) return { processed: 0, generated: 0 };

  const feedsByUser = groupByUser(autoFeeds);
  let totalGenerated = 0;
  let totalProcessed = 0;

  for (const [userId, feeds] of Array.from(feedsByUser)) {
    const { apiKey, usingPersonalKey } = await resolveUserApiKeyWithMode(userId);

    if (!usingPersonalKey) {
      const creditCheck = await checkCredits(userId, "generate");
      if (!creditCheck.ok) {
        logger.info(
          { userId, creditsRemaining: creditCheck.creditsRemaining },
          "feed-auto-generate: insufficient credits, skipping user",
        );
        continue;
      }
    }

    let slotsRemaining = MAX_AUTO_PER_USER;

    for (const feed of feeds) {
      if (slotsRemaining <= 0) break;
      totalProcessed++;

      try {
        if (await hasReachedDailyLimit(feed.id, todayStart)) {
          logger.info(
            { feedId: feed.id, userId },
            "feed-auto-generate: daily limit reached for feed, skipping",
          );
          continue;
        }

        const item = await findNewItem(feed);
        if (!item) continue;

        const generated = await generateFromFeedItem(
          userId,
          feed,
          item,
          apiKey,
          usingPersonalKey,
          now,
        );

        if (generated) {
          totalGenerated++;
          slotsRemaining--;
        } else if (!usingPersonalKey) {
          // generateFromFeedItem returns false for credit exhaustion — stop this user
          break;
        }
      } catch (err) {
        logger.error(
          { feedId: feed.id, userId, err },
          "feed-auto-generate: error processing feed",
        );
      }
    }
  }

  logger.info(
    { processed: totalProcessed, generated: totalGenerated },
    "feed-auto-generate: complete",
  );
  return { processed: totalProcessed, generated: totalGenerated };
}
