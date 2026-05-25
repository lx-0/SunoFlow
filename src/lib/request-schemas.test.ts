import { describe, expect, it } from "vitest";
import { recordPlayRequestSchema } from "@/lib/analytics-data/request";
import { recordHistoryRequestSchema } from "@/lib/history/request";
import { mashupRequestSchema } from "@/lib/mashup/request";
import { createNotificationRequestSchema } from "@/lib/notifications/request";
import { radioQuerySchema } from "@/lib/radio/request";
import {
  recommendationsQuerySchema,
  similarRecommendationsQuerySchema,
} from "@/lib/recommendations/request";
import {
  discoverFeedQuerySchema,
  discoverPlaylistsQuerySchema,
  discoverSongsQuerySchema,
  toDiscoverPlaylistsQuery,
  toDiscoverSongsQuery,
  trendingSongsQuerySchema,
} from "@/lib/discovery/request";
import { publicSongsQuerySchema, songsQuerySchema } from "@/lib/songs/request";
import { recommendationQuerySchema } from "@/lib/songs/recommendation-request";

describe("request schemas", () => {
  it("validates analytics play payloads", () => {
    expect(
      recordPlayRequestSchema.parse({ songId: "song-1", durationSec: 42 }),
    ).toEqual({ songId: "song-1", durationSec: 42 });
    expect(() => recordPlayRequestSchema.parse({ songId: "" })).toThrow();
  });

  it("validates history payloads", () => {
    expect(recordHistoryRequestSchema.parse({ songId: "song-1" })).toEqual({
      songId: "song-1",
    });
    expect(() => recordHistoryRequestSchema.parse({ songId: "" })).toThrow();
  });

  it("validates mashup payloads", () => {
    expect(
      mashupRequestSchema.parse({
        trackA: { songId: "a" },
        trackB: { fileUrl: "https://example.com/track.mp3" },
      }),
    ).toMatchObject({
      trackA: { songId: "a" },
      trackB: { fileUrl: "https://example.com/track.mp3" },
    });
    expect(() =>
      mashupRequestSchema.parse({
        trackA: {},
        trackB: { songId: "b" },
      }),
    ).toThrow();
  });

  it("validates notification payloads", () => {
    expect(
      createNotificationRequestSchema.parse({
        type: "generation_complete",
        title: "Ready",
        message: "Your song is ready",
      }),
    ).toMatchObject({
      type: "generation_complete",
      title: "Ready",
      message: "Your song is ready",
    });
    expect(() =>
      createNotificationRequestSchema.parse({
        type: "unknown",
        title: "x",
        message: "y",
      }),
    ).toThrow();
  });

  it("normalizes recommendations query params", () => {
    expect(recommendationsQuerySchema.parse({ limit: "999", exclude: "a,b" })).toEqual({
      limit: 50,
      exclude: ["a", "b"],
    });
    expect(similarRecommendationsQuerySchema.parse({ songId: "song-1", limit: "2" })).toEqual({
      songId: "song-1",
      limit: 2,
    });
    expect(() => similarRecommendationsQuerySchema.parse({ songId: "" })).toThrow();
    expect(recommendationQuerySchema.parse({ limit: "999" })).toEqual({ limit: 8 });
  });

  it("normalizes radio query params", () => {
    expect(
      radioQuerySchema.parse({
        mood: " focus ",
        genre: " electronic ",
        tempoMin: "120",
        tempoMax: "bad",
        excludeIds: "a,b",
        seedSongId: " seed-1 ",
        limit: "999",
      }),
    ).toEqual({
      mood: "focus",
      genre: "electronic",
      tempoMin: 120,
      tempoMax: undefined,
      excludeIds: ["a", "b"],
      seedSongId: "seed-1",
      limit: 50,
    });
  });

  it("normalizes songs query params", () => {
    expect(
      songsQuerySchema.parse({
        q: "  hi  ",
        tagId: "tag-1",
        includeVariations: "true",
        archived: "false",
      }),
    ).toMatchObject({
      search: "hi",
      tagIds: ["tag-1"],
      includeVariations: true,
      archived: false,
    });

    expect(
      publicSongsQuerySchema.parse({
        q: " query ",
        sort: "invalid",
        limit: "15",
        offset: "2",
      }),
    ).toEqual({
      q: "query",
      genre: undefined,
      mood: undefined,
      sort: "newest",
      limit: 15,
      offset: 2,
    });
  });

  it("normalizes discovery query params", () => {
    const discover = discoverSongsQuerySchema.parse({
      page: "0",
      sortBy: "bad",
      tag: " synthwave ",
      tempoMin: "128",
      tempoMax: "bad",
    });

    expect(toDiscoverSongsQuery(discover)).toEqual({
      page: 1,
      sortBy: "newest",
      tag: "synthwave",
      mood: undefined,
      tempoMin: 128,
      tempoMax: null,
    });

    expect(
      trendingSongsQuerySchema.parse({ sort: "invalid", limit: "999", offset: "-2" }),
    ).toEqual({
      sort: "trending",
      limit: 100,
      offset: 0,
      genre: undefined,
      mood: undefined,
    });

    expect(discoverFeedQuerySchema.parse({ page: "0", tag: " chill ", mood: " focus " })).toEqual(
      {
        page: 1,
        tag: "chill",
        mood: "focus",
      },
    );

    expect(
      toDiscoverPlaylistsQuery(
        discoverPlaylistsQuerySchema.parse({
          sort: "bad",
          page: "0",
          limit: "999",
          genre: " lo-fi ",
        }),
      ),
    ).toEqual({
      sort: "trending",
      genre: "lo-fi",
      page: 1,
      limit: 100,
    });

    expect(
      discoverPlaylistsQuerySchema.parse({
        sort: "bad",
        page: "0",
        limit: "999",
        genre: " lo-fi ",
      }),
    ).toEqual({
      sort: "trending",
      genre: "lo-fi",
      page: 1,
      limit: 100,
    });
  });
});
