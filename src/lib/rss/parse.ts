export function extractTagContent(xml: string, tag: string): string {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(":", ":");
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i");
  const match = xml.match(regex);
  return match ? stripCDATA(match[1].trim()) : "";
}

export function extractAllTagContent(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

export function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

export function stripTags(text: string): string {
  // Drop <script>/<style> blocks AND their inner CSS/JS source — otherwise the
  // text between the tags pollutes the article body. Some Atom feeds (e.g.
  // karpathy's) ship ESCAPED HTML, so the <style> only becomes a real tag after
  // decoding; decode first, then drop the blocks, then strip remaining tags.
  const dropBlocks = (s: string) =>
    s
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");
  let s = dropBlocks(decodeHtmlEntities(text));
  s = dropBlocks(decodeHtmlEntities(s)); // second pass for double-encoded feeds
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Bracketed read-more links that German/English feeds append to summaries.
// tagesschau ships "[<a href>mehr</a>]" inside <content:encoded>; after tags are
// stripped the literal "[ mehr ]" survives. These are UI artifacts, never body text.
const READ_MORE_MARKER =
  /\[\s*(?:mehr(?:\s+lesen)?|weiterlesen|read\s*more|more|continue\s*reading|…|\.\.\.)\s*\]/gi;
// A summary cut mid-thought ends with a dangling ellipsis. Only treat a
// trailing one as truncation — a mid-sentence "…" is legitimate prose.
const TRAILING_ELLIPSIS = /\s*(?:…|\.\.\.)\s*$/;

export function hasReadMoreMarker(text: string): boolean {
  READ_MORE_MARKER.lastIndex = 0;
  return READ_MORE_MARKER.test(text) || TRAILING_ELLIPSIS.test(text);
}

export function stripReadMoreMarker(text: string): string {
  return text
    .replace(READ_MORE_MARKER, "")
    .replace(TRAILING_ELLIPSIS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractAtomLink(itemXml: string): string {
  const match = itemXml.match(
    /<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i
  );
  return match ? match[1] : "";
}
