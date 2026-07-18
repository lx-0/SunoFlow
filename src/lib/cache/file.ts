import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, unlinkSync, createReadStream, promises as fsp } from "fs";
import { join } from "path";

// Convert a Node Readable stream to a Web ReadableStream WITHOUT importing
// `node:stream` (which webpack's edge target cannot resolve, breaking the
// build via instrumentation.ts → @/lib/cache/warmup → here). Re-implements
// the small subset of stream.Readable.toWeb() we actually need.
type NodeReadable = NodeJS.ReadableStream;
function nodeStreamToWeb(node: NodeReadable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      node.on("data", (chunk: Buffer | string) => {
        const u8 =
          typeof chunk === "string"
            ? new TextEncoder().encode(chunk)
            : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        controller.enqueue(u8);
      });
      node.on("end", () => controller.close());
      node.on("error", (err) => controller.error(err));
    },
    cancel() {
      // best-effort — destroy if the underlying stream supports it
      const destroyable = node as { destroy?: (err?: Error) => void };
      destroyable.destroy?.();
    },
  });
}
import { logger } from "@/lib/logger";

export interface CachedFile {
  data: Buffer;
  contentType: string;
}

export interface CachedStream {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
}

interface FileCacheConfig {
  envVar: string;
  defaultSubdir: string;
  extensions: string[];
  contentTypes: Record<string, string>;
  /** Env var holding the byte cap for this cache. "0" disables eviction. */
  maxBytesEnvVar?: string;
  /** Fallback byte cap when the env var is unset. 0/undefined disables eviction. */
  defaultMaxBytes?: number;
  /**
   * Bytes written between opportunistic eviction checks (default 100 MB).
   * Bounds growth during a write burst between scheduled sweeps.
   */
  opportunisticEvictBytes?: number;
}

export interface FileCacheStats {
  count: number;
  totalBytes: number;
  maxBytes: number;
}

export interface EvictionResult {
  evicted: number;
  freedBytes: number;
}

// Evict down to 90% of the cap (hysteresis so a sweep doesn't re-trigger on
// the very next put) and never touch files younger than 60 s — a file that
// was just written (or is mid-download) always has the newest mtime.
const LOW_WATER_RATIO = 0.9;
const MIN_AGE_MS = 60_000;
const DEFAULT_OPPORTUNISTIC_EVICT_BYTES = 100_000_000;

export interface FileCache {
  get(id: string): CachedFile | null;
  /**
   * Stream the cached file (optionally a byte range) without buffering the
   * whole content into memory or blocking the Node.js event loop. Use this
   * for audio/video range responses — `get` reads the full file with
   * `readFileSync` and is unsuitable for hot paths.
   *
   * Returns null when the file is absent. Returns size of the FULL file
   * (not the slice) so callers can build Content-Range correctly.
   */
  getStream(id: string, start?: number, end?: number): CachedStream | null;
  getSize(id: string): number | null;
  put(id: string, data: Buffer, contentType?: string): void;
  has(id: string): boolean;
  downloadAndPut(id: string, url: string): Promise<Buffer | null>;
  count(): number;
  /**
   * Full-directory scan (readdir + stat per file). Cheap at hundreds of
   * files but keep it off the request path — call only from the eviction
   * sweep and /api/health.
   */
  getStats(): FileCacheStats;
  /**
   * Evict least-recently-written files (mtime LRU — atime is unreliable on
   * noatime volumes) until the cache is at or below LOW_WATER_RATIO * cap.
   * No-op when eviction is disabled (cap <= 0), the cache is under the cap,
   * or an eviction is already in flight (single-flight guard).
   *
   * Evicting a file that is currently being streamed is safe on POSIX:
   * unlink only removes the directory entry; open fds keep reading the
   * inode until they close. New lookups miss and re-download.
   */
  evictToCap(): EvictionResult;
}

// Exported for tests — production code must use the audioCache/imageCache
// singletons below.
export function createFileCache(config: FileCacheConfig): FileCache {
  const cacheDir = process.env[config.envVar] || join(process.cwd(), config.defaultSubdir);
  const maxBytes = resolveMaxBytes(config);
  const opportunisticEvictBytes =
    config.opportunisticEvictBytes ?? DEFAULT_OPPORTUNISTIC_EVICT_BYTES;
  let dirReady = false;
  let evicting = false;
  let bytesWrittenSinceEvictCheck = 0;

  function resolveMaxBytes(cfg: FileCacheConfig): number {
    const raw = cfg.maxBytesEnvVar ? process.env[cfg.maxBytesEnvVar] : undefined;
    if (raw !== undefined && raw !== "") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
      logger.warn(
        { envVar: cfg.maxBytesEnvVar, raw },
        "file-cache: invalid max-bytes env value ignored"
      );
    }
    return cfg.defaultMaxBytes ?? 0;
  }

  function listFiles(): { path: string; size: number; mtimeMs: number }[] {
    ensureDir();
    const files: { path: string; size: number; mtimeMs: number }[] = [];
    for (const name of readdirSync(cacheDir)) {
      if (!config.extensions.some((ext) => name.endsWith(ext))) continue;
      const p = join(cacheDir, name);
      try {
        const st = statSync(p);
        files.push({ path: p, size: st.size, mtimeMs: st.mtimeMs });
      } catch {
        // raced deletion — skip
      }
    }
    return files;
  }

  function ensureDir() {
    if (dirReady) return;
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    dirReady = true;
  }

  function safeName(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function findFile(id: string): string | null {
    const safe = safeName(id);
    for (const ext of config.extensions) {
      const p = join(cacheDir, `${safe}${ext}`);
      if (existsSync(p)) return p;
    }
    return null;
  }

  function contentTypeFor(path: string): string {
    const ext = path.slice(path.lastIndexOf("."));
    return config.contentTypes[ext] ?? "application/octet-stream";
  }

  function resolveExtension(contentType?: string): string {
    if (!contentType) return config.extensions[0];
    for (const [ext, mime] of Object.entries(config.contentTypes)) {
      const subtype = mime.split("/")[1];
      if (contentType.includes(subtype)) return ext;
    }
    return config.extensions[0];
  }

  const cache: FileCache = {
    get(id) {
      // Sync read kept for cold paths (admin tools, tests). Hot paths must
      // use getStream — readFileSync on a 5 MB audio file stalls the event
      // loop and serialises every concurrent request behind it.
      const p = findFile(id);
      if (!p) return null;
      return {
        data: readFileSync(p),
        contentType: contentTypeFor(p),
      };
    },

    getStream(id, start, end) {
      const p = findFile(id);
      if (!p) return null;
      let size: number;
      let fd: number;
      try {
        size = statSync(p).size;
        // Open the fd eagerly (createReadStream opens lazily) so a returned
        // stream can never race eviction: once the fd is open, a POSIX
        // unlink only removes the directory entry and reads keep working.
        fd = openSync(p, "r");
      } catch {
        return null;
      }
      const nodeStream: NodeReadable = createReadStream(p, {
        fd,
        start: start ?? 0,
        end: end ?? size - 1,
      });
      return {
        stream: nodeStreamToWeb(nodeStream),
        contentType: contentTypeFor(p),
        size,
      };
    },

    getSize(id) {
      const p = findFile(id);
      if (!p) return null;
      return statSync(p).size;
    },

    put(id, data, contentType?) {
      try {
        ensureDir();
        const ext = resolveExtension(contentType);
        const fp = join(cacheDir, `${safeName(id)}${ext}`);
        // Fire-and-forget async write — keeps the call sync for existing
        // callers but avoids blocking the event loop on a multi-MB flush.
        // Errors are logged; no caller reads the file back synchronously
        // after put, so the brief delay is tolerable.
        fsp
          .writeFile(fp, data)
          .then(() => {
            // Opportunistic eviction: bound growth between scheduled sweeps
            // when a burst of writes lands. Runs off the caller's sync path
            // (post-write callback) and is single-flighted via `evicting`.
            if (maxBytes <= 0) return;
            bytesWrittenSinceEvictCheck += data.length;
            if (bytesWrittenSinceEvictCheck >= opportunisticEvictBytes) {
              bytesWrittenSinceEvictCheck = 0;
              cache.evictToCap();
            }
          })
          .catch((err) => {
            logger.warn({ id, cacheDir, err }, "file-cache: put failed");
          });
      } catch (err) {
        logger.warn({ id, cacheDir, err }, "file-cache: put setup failed");
      }
    },

    has(id) {
      return findFile(id) !== null;
    },

    async downloadAndPut(id, url) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          logger.warn({ id, url, status: res.status }, "file-cache: download failed");
          return null;
        }
        const contentType = res.headers.get("content-type") ?? undefined;
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        cache.put(id, buf, contentType);
        return buf;
      } catch (err) {
        logger.warn({ id, url, err }, "file-cache: downloadAndPut failed");
        return null;
      }
    },

    count() {
      try {
        ensureDir();
        return readdirSync(cacheDir).filter((f) =>
          config.extensions.some((ext) => f.endsWith(ext))
        ).length;
      } catch {
        return 0;
      }
    },

    getStats() {
      try {
        const files = listFiles();
        return {
          count: files.length,
          totalBytes: files.reduce((sum, f) => sum + f.size, 0),
          maxBytes,
        };
      } catch {
        return { count: 0, totalBytes: 0, maxBytes };
      }
    },

    evictToCap() {
      const none: EvictionResult = { evicted: 0, freedBytes: 0 };
      if (maxBytes <= 0 || evicting) return none;
      evicting = true;
      try {
        const files = listFiles();
        let totalBytes = files.reduce((sum, f) => sum + f.size, 0);
        if (totalBytes <= maxBytes) return none;

        const target = maxBytes * LOW_WATER_RATIO;
        const minAgeCutoff = Date.now() - MIN_AGE_MS;
        let evicted = 0;
        let freedBytes = 0;

        // Oldest mtime first; skip anything younger than MIN_AGE_MS so a
        // file mid-write/mid-download is never a target.
        for (const file of [...files].sort((a, b) => a.mtimeMs - b.mtimeMs)) {
          if (totalBytes <= target) break;
          if (file.mtimeMs > minAgeCutoff) continue;
          try {
            unlinkSync(file.path);
          } catch {
            continue; // raced deletion / transient fs error — move on
          }
          totalBytes -= file.size;
          evicted++;
          freedBytes += file.size;
        }

        if (evicted > 0) {
          logger.info(
            { cacheDir, evicted, freedBytes, totalBytes, maxBytes },
            "file-cache: evicted to cap"
          );
        }
        return { evicted, freedBytes };
      } catch (err) {
        logger.warn({ cacheDir, err }, "file-cache: eviction failed");
        return none;
      } finally {
        evicting = false;
      }
    },
  };

  return cache;
}

export const audioCache = createFileCache({
  envVar: "AUDIO_CACHE_DIR",
  defaultSubdir: ".audio-cache",
  extensions: [".mp3"],
  contentTypes: { ".mp3": "audio/mpeg" },
  maxBytesEnvVar: "AUDIO_CACHE_MAX_BYTES",
  defaultMaxBytes: 2_000_000_000, // 2 GB ≈ 400 tracks at ~5 MB
});

export const imageCache = createFileCache({
  envVar: "IMAGE_CACHE_DIR",
  defaultSubdir: ".image-cache",
  extensions: [".jpg", ".png", ".webp"],
  contentTypes: { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" },
  maxBytesEnvVar: "IMAGE_CACHE_MAX_BYTES",
  defaultMaxBytes: 500_000_000, // 500 MB
});
