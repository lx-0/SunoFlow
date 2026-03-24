/**
 * Returns the CDN-proxied URL for a song's audio asset.
 *
 * The `/api/audio/[songId]` route proxies audio from the Suno origin and sets
 * `Cache-Control: public, max-age=86400, immutable` so CDN edges
 * (Vercel Edge, Cloudflare) can cache the audio globally, reducing latency
 * for users far from the Suno origin.
 *
 * @param songId - The internal song ID (primary key in the songs table)
 * @returns A relative URL that resolves through the CDN proxy route
 */
export function proxiedAudioUrl(songId: string): string {
  return `/api/audio/${songId}`;
}
