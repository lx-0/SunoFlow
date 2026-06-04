// Pure, framework-agnostic tag-string helpers shared by the web (root) and
// mobile (apps/mobile) apps. No prisma, no React, no Node/Expo — safe to import
// from any client bundle. Server-side tag CRUD lives in src/lib/tags (web only).

export function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function splitTagCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function normalizedTagList(raw: string | null): string[] {
  return splitTagCsv(raw).map((tag) => tag.toLowerCase());
}

export function firstTag(raw: string | null): string | null {
  return splitTagCsv(raw)[0] ?? null;
}

export function normalizeTagCombo(raw: string | null): string {
  return normalizedTagList(raw).sort().join(", ");
}

export function collectSongTokens(
  songTags: { tag: { name: string } }[],
  tagsStr: string | null,
): string[] {
  return Array.from(
    new Set([
      ...songTags.map((st) => st.tag.name.toLowerCase()),
      ...parseTags(tagsStr),
    ]),
  );
}

export function tagOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const shared = b.filter((t) => setA.has(t)).length;
  return shared / Math.max(a.length, b.length);
}

export function countGenres(
  songs: Array<{ tags: string | null }>,
  limit: number = 12,
): Array<{ genre: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const song of songs) {
    for (const raw of splitTagCsv(song.tags)) {
      const genre = raw.toLowerCase();
      if (genre) counts[genre] = (counts[genre] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, count]) => ({ genre, count }));
}
