import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = process.env.IMAGE_CACHE_DIR || join(process.cwd(), ".image-cache");

let dirReady = false;

function ensureDir() {
  if (dirReady) return;
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  dirReady = true;
}

function safeName(songId: string): string {
  return songId.replace(/[^a-zA-Z0-9_-]/g, "");
}

function findCachedFile(songId: string): string | null {
  const safe = safeName(songId);
  for (const ext of [".jpg", ".png", ".webp"]) {
    const p = join(CACHE_DIR, `${safe}${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

export function hasCachedImage(songId: string): boolean {
  return findCachedFile(songId) !== null;
}

export function getCachedImage(songId: string): { data: Buffer; contentType: string } | null {
  const p = findCachedFile(songId);
  if (!p) return null;
  const ext = p.slice(p.lastIndexOf("."));
  const contentType =
    ext === ".png" ? "image/png" :
    ext === ".webp" ? "image/webp" :
    "image/jpeg";
  return { data: readFileSync(p), contentType };
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}

export function cacheImage(songId: string, data: Buffer, contentType: string): void {
  try {
    ensureDir();
    const ext = extFromContentType(contentType);
    writeFileSync(join(CACHE_DIR, `${safeName(songId)}${ext}`), data);
  } catch {
    // Non-fatal — worst case we fetch from CDN again next time
  }
}

export async function downloadAndCacheImage(
  songId: string,
  imageUrl: string,
): Promise<Buffer | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    cacheImage(songId, buf, contentType);
    return buf;
  } catch {
    return null;
  }
}

export function cachedImageCount(): number {
  try {
    ensureDir();
    return readdirSync(CACHE_DIR).filter((f) =>
      f.endsWith(".jpg") || f.endsWith(".png") || f.endsWith(".webp")
    ).length;
  } catch {
    return 0;
  }
}
