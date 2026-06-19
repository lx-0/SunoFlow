import {
  extractTagContent,
  extractAllTagContent,
  stripCDATA,
  stripTags,
  extractAtomLink,
  hasReadMoreMarker,
  stripReadMoreMarker,
} from "./parse";
import { enrichItem } from "./enrich";
import { extractArticleContent } from "./extract-article";
import type { RssItem, FeedResult } from "./types";

export type { RssItem, FeedResult };

// Full article bodies (and the inline feed content fallback) may run long —
// keep the whole thing, bounded only against runaway pages.
const MAX_CONTENT_CHARS = 50_000;
// Cover every displayed item (feeds are sliced to 20), not just the first 5.
const MAX_ARTICLE_FETCHES = 20;
// Cap simultaneous outbound article fetches per feed to stay a good citizen.
const FETCH_CONCURRENCY = 6;
// Hard ceiling on how long article backfill may delay the feed response.
// Whatever hasn't resolved by then keeps its (marker-stripped) summary.
const ENRICH_BUDGET_MS = 12000;

// RSS is an article-feed format: the inline <description>/<content:encoded> is
// at best a summary, at worst a one-sentence teaser. So whenever an item has a
// link, follow it and fetch the real article. (We only keep the fetched body if
// it's actually longer than what we already have — see enrichWithFullArticle.)
function needsFullArticle(item: RssItem): boolean {
  return Boolean(item.link);
}

async function enrichWithFullArticle(items: RssItem[]): Promise<RssItem[]> {
  const result = [...items];
  const targets = result
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => index < MAX_ARTICLE_FETCHES)
    .filter(({ item }) => needsFullArticle(item));

  if (targets.length === 0) return result;

  const deadline = Date.now() + ENRICH_BUDGET_MS;

  const run = async () => {
    for (let i = 0; i < targets.length; i += FETCH_CONCURRENCY) {
      if (Date.now() >= deadline) break;
      const batch = targets.slice(i, i + FETCH_CONCURRENCY);
      await Promise.all(
        batch.map(async ({ item, index }) => {
          const article = await extractArticleContent(item.link!);
          if (!article) return;
          // Never downgrade: some feeds already ship a fuller body inline than
          // the stripped article page yields. Keep whichever is longer.
          const existing = item.content || "";
          if (article.length <= existing.length) return;
          result[index] = {
            ...item,
            content: article.slice(0, MAX_CONTENT_CHARS),
            description: article.slice(0, 800),
            truncated: false,
          };
        })
      );
    }
  };

  // `result` is mutated in place as fetches resolve, so racing the batch loop
  // against a hard deadline returns partial progress without ever hanging the
  // feed — slow articles simply keep their marker-stripped summary.
  await Promise.race([
    run(),
    new Promise<void>((resolve) => setTimeout(resolve, ENRICH_BUDGET_MS)),
  ]);

  return result;
}

export async function fetchFeed(url: string): Promise<FeedResult> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept:
          "application/rss+xml, application/atom+xml, text/xml, application/xml, */*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();

    const isAtom =
      /<feed[^>]*xmlns[^>]*>/i.test(xml) || /<feed\s/i.test(xml);

    let feedTitle = "";
    let items: RssItem[] = [];

    if (isAtom) {
      const titleMatch = xml.match(/<title[^>]*>([^<]*)<\/title>/i);
      feedTitle = titleMatch ? stripCDATA(titleMatch[1].trim()) : url;

      const entryXmls = extractAllTagContent(xml, "entry");
      items = entryXmls.slice(0, 20).map((entry) => {
        const title = stripTags(extractTagContent(entry, "title"));
        const rawContent =
          extractTagContent(entry, "content") ||
          extractTagContent(entry, "summary");
        const rawText = stripTags(rawContent);
        const truncated = hasReadMoreMarker(rawText);
        const fullText = stripReadMoreMarker(rawText);
        const description = fullText.slice(0, 800);
        const content = fullText.slice(0, MAX_CONTENT_CHARS);
        const link = extractAtomLink(entry) || extractTagContent(entry, "id");
        return { title, description, content, link, source: feedTitle, truncated };
      });
    } else {
      const channelMatch = xml.match(
        /<channel[^>]*>([\s\S]*?)<\/channel>/i
      );
      const channelXml = channelMatch ? channelMatch[1] : xml;

      const firstItemIndex = channelXml.search(/<item[\s>]/i);
      const headerXml =
        firstItemIndex > 0 ? channelXml.slice(0, firstItemIndex) : channelXml;
      const titleMatch = headerXml.match(/<title[^>]*>([^<]*)<\/title>/i);
      feedTitle = titleMatch ? stripCDATA(titleMatch[1].trim()) : url;

      const itemXmls = extractAllTagContent(channelXml, "item");
      items = itemXmls.slice(0, 20).map((item) => {
        const title = stripTags(
          stripCDATA(extractTagContent(item, "title"))
        );
        const contentEncoded =
          extractTagContent(item, "content:encoded") ||
          extractTagContent(item, "encoded");
        const rawDescription = contentEncoded ||
          stripCDATA(extractTagContent(item, "description"));
        const rawText = stripTags(rawDescription);
        const truncated = hasReadMoreMarker(rawText);
        const fullText = stripReadMoreMarker(rawText);
        const description = fullText.slice(0, 800);
        const content = fullText.slice(0, MAX_CONTENT_CHARS);
        const link = extractTagContent(item, "link");
        const pubDate = extractTagContent(item, "pubDate");
        return { title, description, content, link, source: feedTitle, pubDate, truncated };
      });
    }

    items = items.filter((i) => i.title.length > 0);
    items = await enrichWithFullArticle(items);
    items = items.map(enrichItem);

    return { url, feedTitle, items };
  } catch (err) {
    return {
      url,
      feedTitle: url,
      items: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
