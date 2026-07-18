import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { FileCache } from "./file";

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.byteLength, 0);
  const out = Buffer.alloc(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

describe("audioCache.getStream", () => {
  let tmpDir: string;
  const fixtureContent = Buffer.from("0123456789ABCDEFGHIJ"); // 20 bytes

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sunoflow-cache-test-"));
    process.env.AUDIO_CACHE_DIR = tmpDir;
    writeFileSync(join(tmpDir, "song1.mp3"), fixtureContent);
    // The cache module captures AUDIO_CACHE_DIR at load time, so force a
    // fresh import per test to pick up our temp dir.
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.AUDIO_CACHE_DIR;
  });

  it("returns null when the file is missing", async () => {
    const { audioCache } = await import("./file");
    expect(audioCache.getStream("missing")).toBeNull();
  });

  it("streams the full file when no range is given", async () => {
    const { audioCache } = await import("./file");
    const result = audioCache.getStream("song1");
    expect(result).not.toBeNull();
    expect(result!.size).toBe(20);
    expect(result!.contentType).toBe("audio/mpeg");
    const buf = await streamToBuffer(result!.stream);
    expect(buf.toString()).toBe("0123456789ABCDEFGHIJ");
  });

  it("streams the requested byte range only", async () => {
    const { audioCache } = await import("./file");
    const result = audioCache.getStream("song1", 5, 9);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(20); // full-file size reported
    const buf = await streamToBuffer(result!.stream);
    expect(buf.toString()).toBe("56789"); // 5 bytes from offset 5
  });
});

describe("evictToCap / getStats", () => {
  const DIR_ENV = "TEST_EVICT_CACHE_DIR";
  const MAX_ENV = "TEST_EVICT_CACHE_MAX_BYTES";
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sunoflow-evict-test-"));
    process.env[DIR_ENV] = tmpDir;
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    delete process.env[DIR_ENV];
    delete process.env[MAX_ENV];
  });

  async function makeCache(
    maxBytes: number | undefined,
    opts?: { opportunisticEvictBytes?: number }
  ): Promise<FileCache> {
    if (maxBytes !== undefined) process.env[MAX_ENV] = String(maxBytes);
    const { createFileCache } = await import("./file");
    return createFileCache({
      envVar: DIR_ENV,
      defaultSubdir: ".test-evict-cache",
      extensions: [".mp3"],
      contentTypes: { ".mp3": "audio/mpeg" },
      maxBytesEnvVar: MAX_ENV,
      ...opts,
    });
  }

  /** Write a file with a controlled age (mtime set `ageMs` in the past). */
  function writeAged(name: string, bytes: number, ageMs: number): string {
    const p = join(tmpDir, name);
    writeFileSync(p, Buffer.alloc(bytes, 0x61));
    const t = (Date.now() - ageMs) / 1000;
    utimesSync(p, t, t);
    return p;
  }

  const MINUTES = 60_000;

  it("evicts oldest files first and stops at the low-water mark", async () => {
    const cache = await makeCache(1000); // low water = 900
    writeAged("a.mp3", 400, 5 * MINUTES); // oldest — evicted
    writeAged("b.mp3", 400, 4 * MINUTES);
    writeAged("c.mp3", 400, 3 * MINUTES);

    const result = cache.evictToCap();

    // 1200 > 1000 → evict a (oldest) → 800 <= 900 → stop
    expect(result).toEqual({ evicted: 1, freedBytes: 400 });
    expect(existsSync(join(tmpDir, "a.mp3"))).toBe(false);
    expect(existsSync(join(tmpDir, "b.mp3"))).toBe(true);
    expect(existsSync(join(tmpDir, "c.mp3"))).toBe(true);
  });

  it("is a no-op when the cache is under the cap", async () => {
    const cache = await makeCache(1000);
    writeAged("a.mp3", 400, 5 * MINUTES);
    writeAged("b.mp3", 400, 4 * MINUTES);

    expect(cache.evictToCap()).toEqual({ evicted: 0, freedBytes: 0 });
    expect(existsSync(join(tmpDir, "a.mp3"))).toBe(true);
    expect(existsSync(join(tmpDir, "b.mp3"))).toBe(true);
  });

  it("never evicts files younger than the min age", async () => {
    const cache = await makeCache(1000);
    writeAged("old.mp3", 400, 5 * MINUTES);
    writeAged("fresh1.mp3", 400, 0); // just written — protected
    writeAged("fresh2.mp3", 400, 0); // just written — protected

    const result = cache.evictToCap();

    // Only the old file is eligible even though 800 > 900 is not reached
    expect(result).toEqual({ evicted: 1, freedBytes: 400 });
    expect(existsSync(join(tmpDir, "old.mp3"))).toBe(false);
    expect(existsSync(join(tmpDir, "fresh1.mp3"))).toBe(true);
    expect(existsSync(join(tmpDir, "fresh2.mp3"))).toBe(true);
  });

  it("evicts nothing when only fresh files exist, even over the cap", async () => {
    const cache = await makeCache(500);
    writeAged("fresh1.mp3", 400, 0);
    writeAged("fresh2.mp3", 400, 0);

    expect(cache.evictToCap()).toEqual({ evicted: 0, freedBytes: 0 });
    expect(existsSync(join(tmpDir, "fresh1.mp3"))).toBe(true);
    expect(existsSync(join(tmpDir, "fresh2.mp3"))).toBe(true);
  });

  it("is disabled when the cap is 0", async () => {
    const cache = await makeCache(0);
    writeAged("a.mp3", 400, 5 * MINUTES);
    writeAged("b.mp3", 400, 4 * MINUTES);

    expect(cache.evictToCap()).toEqual({ evicted: 0, freedBytes: 0 });
    expect(existsSync(join(tmpDir, "a.mp3"))).toBe(true);
  });

  it("getStats sums count and bytes of matching files only", async () => {
    const cache = await makeCache(1000);
    writeAged("a.mp3", 400, 5 * MINUTES);
    writeAged("b.mp3", 300, 4 * MINUTES);
    writeFileSync(join(tmpDir, "ignored.txt"), Buffer.alloc(999));

    expect(cache.getStats()).toEqual({ count: 2, totalBytes: 700, maxBytes: 1000 });
  });

  it("keeps an open stream readable after its file is evicted (POSIX unlink)", async () => {
    const cache = await makeCache(10); // 25-byte file is over the cap
    const content = Buffer.from("STREAMED-CONTENT-SURVIVES");
    const p = join(tmpDir, "victim.mp3");
    writeFileSync(p, content);
    const t = (Date.now() - 5 * MINUTES) / 1000;
    utimesSync(p, t, t); // old enough to be evicted

    const streamResult = cache.getStream("victim");
    expect(streamResult).not.toBeNull();

    const evicted = cache.evictToCap();
    expect(evicted.evicted).toBe(1);
    expect(existsSync(p)).toBe(false);

    // The open fd keeps reading the unlinked inode
    const buf = await streamToBuffer(streamResult!.stream);
    expect(buf.toString()).toBe(content.toString());
  });

  it("triggers opportunistic eviction after enough bytes are written", async () => {
    const cache = await makeCache(1000, { opportunisticEvictBytes: 500 });
    writeAged("old-a.mp3", 400, 5 * MINUTES);
    writeAged("old-b.mp3", 400, 4 * MINUTES);

    cache.put("new-a", Buffer.alloc(300, 0x62)); // 300 < 500 — no check yet
    cache.put("new-b", Buffer.alloc(300, 0x62)); // 600 >= 500 — eviction fires

    // put writes are fire-and-forget; poll until the eviction lands.
    await vi.waitFor(() => {
      // 1400 total > 1000 → evict old-a (400) → 1000 > 900 → evict old-b
      // (400) → 600 <= 900. Fresh puts are protected by min-age.
      expect(existsSync(join(tmpDir, "old-a.mp3"))).toBe(false);
      expect(existsSync(join(tmpDir, "old-b.mp3"))).toBe(false);
    });
    expect(existsSync(join(tmpDir, "new-a.mp3"))).toBe(true);
    expect(existsSync(join(tmpDir, "new-b.mp3"))).toBe(true);
  });
});
