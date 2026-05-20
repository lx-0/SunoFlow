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

// Below this, inline feed content is too short to be a real article body even
// without an explicit truncation marker — follow the link anyway.
const CONTENT_THRESHOLD = 200;
// Cover every displayed item (feeds are sliced to 20), not just the first 5.
const MAX_ARTICLE_FETCHES = 20;
// Cap simultaneous outbound article fetches per feed to stay a good citizen.
const FETCH_CONCURRENCY = 6;
// Hard ceiling on how long article backfill may delay the feed response.
// Whatever hasn't resolved by then keeps its (marker-stripped) summary.
const ENRICH_BUDGET_MS = 9000;

// An item needs its full article fetched when the inline feed content is a
// truncated summary (read-more marker) or simply too short to be a real body.
function needsFullArticle(item: RssItem): boolean {
  if (!item.link) return false;
  if (item.truncated) return true;
  const inlineLength = (item.content || item.description || "").length;
  return inlineLength < CONTENT_THRESHOLD;
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
          result[index] = {
            ...item,
            content: article.slice(0, 5000),
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
        const content = fullText.slice(0, 5000);
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
        const content = fullText.slice(0, 5000);
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
