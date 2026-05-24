import { describe, expect, it } from "vitest";
import { applySongsGalleryFilters, type SongWithMeta } from "./filtering";

const NOW = Date.parse("2026-05-24T12:00:00.000Z");

function makeSong(overrides: Partial<SongWithMeta>): SongWithMeta {
  return {
    id: "song-1",
    title: "Default Song",
    prompt: null,
    tags: null,
    createdAt: new Date("2026-05-24T08:00:00.000Z"),
    songTags: [],
    isFavorite: false,
    favoriteCount: 0,
    ...overrides,
  } as SongWithMeta;
}

describe("applySongsGalleryFilters", () => {
  it("filters by search across title, prompt, and tags", () => {
    const songs = [
      makeSong({ id: "song-title", title: "Neon Drive" }),
      makeSong({ id: "song-prompt", title: "Track 2", prompt: "dreamy synthwave jam" }),
      makeSong({ id: "song-tags", title: "Track 3", tags: "chill, lofi" }),
    ];

    const byTitle = applySongsGalleryFilters(songs, {
      search: "neon",
      selectedStyles: new Set(),
      selectedMoods: new Set(),
      dateFilter: -1,
      offlineOnly: false,
      cachedIds: new Set(),
    }, NOW);
    expect(byTitle.map((s) => s.id)).toEqual(["song-title"]);

    const byPrompt = applySongsGalleryFilters(songs, {
      search: "SYNTHWAVE",
      selectedStyles: new Set(),
      selectedMoods: new Set(),
      dateFilter: -1,
      offlineOnly: false,
      cachedIds: new Set(),
    }, NOW);
    expect(byPrompt.map((s) => s.id)).toEqual(["song-prompt"]);

    const byTags = applySongsGalleryFilters(songs, {
      search: "LOFI",
      selectedStyles: new Set(),
      selectedMoods: new Set(),
      dateFilter: -1,
      offlineOnly: false,
      cachedIds: new Set(),
    }, NOW);
    expect(byTags.map((s) => s.id)).toEqual(["song-tags"]);
  });

  it("applies style, mood, date, and offline filters together", () => {
    const songs = [
      makeSong({
        id: "keep",
        tags: "Lo-Fi, Chill",
        prompt: "dreamy background",
        createdAt: new Date("2026-05-24T09:00:00.000Z"),
      }),
      makeSong({
        id: "wrong-style",
        tags: "Rock",
        prompt: "dreamy background",
        createdAt: new Date("2026-05-24T09:00:00.000Z"),
      }),
      makeSong({
        id: "too-old",
        tags: "Lo-Fi, Chill",
        prompt: "dreamy background",
        createdAt: new Date("2026-05-01T09:00:00.000Z"),
      }),
      makeSong({
        id: "not-offline",
        tags: "Lo-Fi, Chill",
        prompt: "dreamy background",
        createdAt: new Date("2026-05-24T09:00:00.000Z"),
      }),
    ];

    const filtered = applySongsGalleryFilters(songs, {
      search: "",
      selectedStyles: new Set(["lo-fi"]),
      selectedMoods: new Set(["dreamy"]),
      dateFilter: 7,
      offlineOnly: true,
      cachedIds: new Set(["keep"]),
    }, NOW);

    expect(filtered.map((s) => s.id)).toEqual(["keep"]);
  });

  it("supports dateFilter=0 as today", () => {
    const songs = [
      makeSong({ id: "today", createdAt: new Date("2026-05-24T00:01:00.000Z") }),
      makeSong({ id: "yesterday", createdAt: new Date("2026-05-23T23:59:59.000Z") }),
    ];

    const filtered = applySongsGalleryFilters(songs, {
      search: "",
      selectedStyles: new Set(),
      selectedMoods: new Set(),
      dateFilter: 0,
      offlineOnly: false,
      cachedIds: new Set(),
    }, NOW);

    expect(filtered.map((s) => s.id)).toEqual(["today"]);
  });
});
