import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { decodeHtmlEntities } from "./parse";
import { isSsrfUrl, isSsrfUrlResolved } from "./ssrf";

export { isSsrfUrl };

const FETCH_TIMEOUT_MS = 8000;
// Article pages routinely exceed 512 KB (tagesschau ~380 KB, heise ~230 KB,
// many news sites >1 MB). Slicing mid-HTML breaks the DOM, so keep the ceiling
// high enough to parse the whole document; only pathological pages are cut.
const MAX_HTML_SIZE = 4_000_000;
const MIN_USEFUL_CONTENT_LENGTH = 100;
const MAX_REDIRECTS = 5;
// Hard ceiling on the returned article text — far above any real news article,
// so the WHOLE article flows downstream; only runaway pages are bounded.
const MAX_ARTICLE_CHARS = 50_000;

function removeElements(html: string, tags: string[]): string {
  let result = html;
  for (const tag of tags) {
    result = result.replace(
      new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"),
      " "
    );
  }
  return result;
}

// Turn a chunk of (article) HTML into paragraph-separated plain text. Used for
// both the Readability output and the regex fallback so spacing is consistent.
function paragraphsFromHtml(html: string): string {
  const paragraphs: string[] = [];
  const pRegex = /<(?:p|li|h[1-6]|blockquote)[^>]*>([\s\S]*?)<\/(?:p|li|h[1-6]|blockquote)>/gi;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = decodeHtmlEntities(
      match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
    ).trim();
    if (text.length > 20) {
      paragraphs.push(text);
    }
  }
  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n");
  }
  return decodeHtmlEntities(
    html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
  ).trim();
}

// Primary extractor: Mozilla Readability over a linkedom DOM. This is the same
// engine Firefox Reader View uses, so it isolates the real article body on
// arbitrary news sites (tagesschau, heise, …) where the hand-rolled regex
// extractor returned only a teaser or nothing.
function extractWithReadability(html: string, url: string): string | null {
  try {
    const { document } = parseHTML(html);
    const reader = new Readability(document, { charThreshold: 200 });
    const article = reader.parse();
    if (!article) return null;
    // Prefer the cleaned article HTML so we keep paragraph breaks; fall back to
    // Readability's flattened textContent.
    const fromHtml = article.content ? paragraphsFromHtml(article.content) : "";
    const text = fromHtml.length >= MIN_USEFUL_CONTENT_LENGTH
      ? fromHtml
      : (article.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
    return text || null;
  } catch {
    // linkedom / Readability can throw on malformed markup — fall back below.
    void url;
    return null;
  }
}

// Fallback extractor (legacy regex) for the rare case Readability bails out.
function extractMainContent(html: string): string {
  let body = html;

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];

  body = removeElements(body, [
    "script",
    "style",
    "nav",
    "header",
    "footer",
    "aside",
    "noscript",
    "iframe",
    "form",
    "svg",
    "figure",
    "figcaption",
  ]);

  const articleMatch = body.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    body = articleMatch[1];
  } else {
    const mainMatch = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) body = mainMatch[1];
  }

  return paragraphsFromHtml(body);
}

async function safeFetch(url: string): Promise<Response | null> {
  let currentUrl = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    // DNS-resolved guard on every hop: feed item links are attacker-influenced
    // (a malicious feed can list internal-IP article links), so the sync
    // hostname check is not enough — resolve and block private IPs per hop.
    if (await isSsrfUrlResolved(currentUrl)) return null;

    const response = await fetch(currentUrl, {
      headers: {
        Accept: "text/html, application/xhtml+xml, */*",
        "User-Agent":
          "Mozilla/5.0 (compatible; SunoFlow/1.0; +https://sunoflow.com)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    return response;
  }
  return null;
}

export async function extractArticleContent(
  url: string
): Promise<string | null> {
  if (await isSsrfUrlResolved(url)) return null;

  try {
    const response = await safeFetch(url);
    if (!response || !response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("xml")) {
      return null;
    }

    const raw = await response.text();
    const html = raw.length > MAX_HTML_SIZE ? raw.slice(0, MAX_HTML_SIZE) : raw;

    // Readability first (robust on real news sites), regex extractor as fallback.
    let content = extractWithReadability(html, response.url || url) ?? "";
    if (content.length < MIN_USEFUL_CONTENT_LENGTH) {
      content = extractMainContent(html);
    }

    if (content.length < MIN_USEFUL_CONTENT_LENGTH) return null;

    // Return the WHOLE article (bounded only against runaway pages), so the
    // full text — not a truncated sentence — drives lyrics generation.
    return content.length > MAX_ARTICLE_CHARS
      ? content.slice(0, MAX_ARTICLE_CHARS)
      : content;
  } catch {
    return null;
  }
}
