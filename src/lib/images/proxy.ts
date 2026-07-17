import { imageCache } from "@/lib/cache";
import { refreshSongCdnUrls } from "@/lib/songs/asset-refresh";

export interface ImageProxyParams {
  songId: string;
  imageUrl: string | null;
  imageUrlIsCustom: boolean;
  sunoJobId: string | null;
  sunoAudioId: string | null;
  /**
   * Parent song's sunoJobId. For alternates, the local `sunoJobId` is a
   * clip-UUID, not a real Suno task-id, so record-info lookups must be
   * keyed by the parent's task-id instead.
   */
  parentSunoJobId?: string | null;
  resolveApiKey: () => Promise<string | undefined>;
}

/**
 * Serve a song's cover image, mirroring proxyAudio's shape: cache hit →
 * download from the stored origin → refresh-on-dead via refreshSongCdnUrls →
 * immutable full-buffer serve. Covers are content-addressed by songId, so
 * successful responses are cached as immutable.
 *
 * Custom covers are never refreshed from Suno — a dead custom origin returns
 * null rather than being replaced by Suno's generated art.
 *
 * Returns null when no image could be served; the route decides how to
 * answer (404).
 */
export async function proxyImage(params: ImageProxyParams): Promise<Response | null> {
  const {
    songId,
    imageUrl,
    imageUrlIsCustom,
    sunoJobId,
    sunoAudioId,
    parentSunoJobId,
    resolveApiKey,
  } = params;

  const cached = imageCache.get(songId);
  if (cached) {
    return serveImage(cached.data, cached.contentType);
  }

  if (!imageUrl) return null;

  const buf = await imageCache.downloadAndPut(songId, imageUrl);
  if (buf) {
    return serveImage(buf, imageCache.get(songId)?.contentType ?? "image/jpeg");
  }

  // Origin is dead. Custom covers have no Suno-side source of truth to
  // refresh from — never replace them with generated art.
  if (imageUrlIsCustom) return null;

  // healAudio: false — a cover request must never rewrite audioUrl (the
  // aggregator can return the same dead URL and would clobber a cdn1 heal).
  const fresh = await refreshSongCdnUrls(
    { id: songId, sunoJobId, sunoAudioId, imageUrlIsCustom, parentSunoJobId },
    { resolveApiKey },
    { healAudio: false },
  );
  if (!fresh?.imageUrl) return null;

  const freshBuf = await imageCache.downloadAndPut(songId, fresh.imageUrl);
  if (!freshBuf) return null;
  return serveImage(freshBuf, imageCache.get(songId)?.contentType ?? "image/jpeg");
}

function serveImage(buf: Buffer, contentType: string): Response {
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
