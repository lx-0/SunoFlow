import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFeed } from "./index";

const ARTICLE_URL = "https://news.example.com/spionage-100.html";
const FEED_URL = "https://news.example.com/feed.xml";

// Mirrors tagesschau's real shape: <content:encoded> is NOT the article — it is
// image + the same summary + a "[<a>mehr</a>]" read-more link. Stripping tags
// leaves the literal "[ mehr ]" artifact.
const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>tagesschau.de</title>
<item>
<title>Mutmaßliche Spione festgenommen</title>
<link>${ARTICLE_URL}</link>
<content:encoded><![CDATA[<p> <a href="${ARTICLE_URL}"><img src="x.jpg" alt="Bundesanwaltschaft" /></a> <br/><br/>Ein Ehepaar soll für China spioniert haben.[<a href="${ARTICLE_URL}">mehr</a>]</p>]]></content:encoded>
<description>Ein Ehepaar soll für China spioniert haben.</description>
<pubDate>Tue, 20 May 2026 10:00:00 GMT</pubDate>
</item>
</channel>
</rss>`;

const FULL_ARTICLE = "Vollständiger erster Absatz mit echten Hintergründen. ".repeat(6);
const ARTICLE_HTML = `<html><body><nav>menu</nav><article><p>${FULL_ARTICLE}</p><p>Zweiter Absatz mit weiteren Details zur Festnahme.</p></article></body></html>`;

function response(body: string, contentType = "text/html; charset=utf-8"): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": contentType }),
    text: async () => body,
  } as Response;
}

describe("fetchFeed — full-article extraction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("follows the article link and feeds the full article text (not the summary), with no read-more marker", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === ARTICLE_URL) return response(ARTICLE_HTML);
      return response(RSS_XML, "application/rss+xml");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFeed(FEED_URL);
    const item = result.items[0];

    expect(fetchMock).toHaveBeenCalledWith(ARTICLE_URL, expect.anything());
    expect(item.content).toContain("Zweiter Absatz mit weiteren Details");
    expect(item.content).not.toContain("[mehr]");
    expect(item.content).not.toContain("[ mehr ]");
    expect(item.description).not.toContain("[mehr]");
    expect(item.description).not.toContain("[ mehr ]");
  });

  it("falls back to the marker-stripped summary when the article fetch fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === ARTICLE_URL) throw new Error("timeout");
      return response(RSS_XML, "application/rss+xml");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFeed(FEED_URL);
    const item = result.items[0];

    expect(item.description).toContain("Ein Ehepaar soll für China spioniert haben");
    expect(item.description).not.toContain("[mehr]");
    expect(item.description).not.toContain("[ mehr ]");
  });
});
