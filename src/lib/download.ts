/**
 * Client-side song download utility with progress tracking and format selection.
 */

export interface DownloadableSong {
  id: string;
  title: string | null | undefined;
  audioUrl: string;
  duration?: number | null;
  createdAt?: Date | string;
}

/**
 * Detect the native format of a song based on its audio URL.
 */
export function detectFormat(audioUrl: string): "mp3" | "wav" {
  return audioUrl.toLowerCase().includes(".wav") ? "wav" : "mp3";
}

/**
 * Download a song via the server-side proxy endpoint.
 * The proxy handles auth, ownership, rate limiting, and metadata embedding.
 *
 * @param song       Song to download.
 * @param onProgress Called with 0–100 (percent). Unknown total → pulses at 50.
 * @param options    Optional overrides (metadata embedding toggle).
 */
export async function downloadSongFile(
  song: DownloadableSong,
  onProgress: (pct: number) => void,
  options: { metadata?: boolean } = {}
): Promise<void> {
  if (!song.audioUrl) throw new Error("No audio URL available");

  onProgress(0);

  const qs = new URLSearchParams();
  if (options.metadata === false) qs.set("metadata", "false");

  const res = await fetch(
    `/api/songs/${song.id}/download${qs.toString() ? `?${qs}` : ""}`
  );

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Download rate limit exceeded. Try again later.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Download failed: ${res.statusText}`);
  }

  const contentLength = res.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = res.body?.getReader();
  if (!reader) {
    // Fallback: no streaming support — load as blob directly
    onProgress(50);
    const blob = await res.blob();
    onProgress(100);
    triggerDownload(blob, extractFilename(res) ?? buildFallbackFilename(song));
    return;
  }

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) {
      onProgress(Math.min(99, Math.round((received / total) * 100)));
    } else {
      // Unknown total — pulse at 50 until done
      onProgress(50);
    }
  }

  const mimeType = res.headers.get("content-type") ?? "audio/mpeg";
  const blob = new Blob(chunks, { type: mimeType });
  onProgress(100);
  triggerDownload(blob, extractFilename(res) ?? buildFallbackFilename(song));
}

/** Extract filename from Content-Disposition header */
function extractFilename(res: Response): string | null {
  const cd = res.headers.get("content-disposition");
  if (!cd) return null;
  const match = cd.match(/filename="?([^";\n]+)"?/);
  return match?.[1] ?? null;
}

/** Fallback filename when Content-Disposition is missing */
function buildFallbackFilename(song: DownloadableSong): string {
  const title = (song.title ?? "song")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "song";
  const date = song.createdAt
    ? new Date(song.createdAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const ext = detectFormat(song.audioUrl);
  return `${title}-${date}.${ext}`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
