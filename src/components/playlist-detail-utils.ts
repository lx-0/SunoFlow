export function reorderByIndex<T>(items: T[], from: number, to: number): T[] {
  if (from === to) return items;
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }

  const reordered = [...items];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
}

export function buildPublicPlaylistUrl(origin: string, slug: string): string {
  return `${origin}/p/${slug}`;
}

export function buildPlaylistEmbedUrl(origin: string, slug: string): string {
  return `${origin}/embed/playlist/${slug}`;
}

export function buildPlaylistEmbedCode(origin: string, slug: string): string {
  return `<iframe src="${buildPlaylistEmbedUrl(origin, slug)}" width="400" height="500" frameborder="0" allow="autoplay"></iframe>`;
}
