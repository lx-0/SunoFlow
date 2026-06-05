import { describe, it, expect } from "vitest";
import {
  createPlaylistBody,
  updatePlaylistBody,
  addPlaylistSongBody,
  reorderPlaylistSongsBody,
  recordHistoryRequestSchema,
} from "./schemas";

describe("createPlaylistBody", () => {
  it("trims + requires a name and caps length", () => {
    expect(createPlaylistBody.parse({ name: "  Mix  " }).name).toBe("Mix");
    expect(createPlaylistBody.safeParse({ name: "   " }).success).toBe(false);
    expect(createPlaylistBody.safeParse({ name: "a".repeat(101) }).success).toBe(false);
  });
});

describe("updatePlaylistBody", () => {
  it("requires at least one of name/description and rejects unknown keys", () => {
    expect(updatePlaylistBody.safeParse({}).success).toBe(false);
    expect(updatePlaylistBody.safeParse({ name: "New" }).success).toBe(true);
    expect(updatePlaylistBody.safeParse({ description: null }).success).toBe(true);
    expect(updatePlaylistBody.safeParse({ name: "New", bogus: 1 }).success).toBe(false);
  });
});

describe("addPlaylistSongBody / reorderPlaylistSongsBody", () => {
  it("addPlaylistSongBody needs a non-empty songId and is strict", () => {
    expect(addPlaylistSongBody.safeParse({ songId: "s1" }).success).toBe(true);
    expect(addPlaylistSongBody.safeParse({ songId: "" }).success).toBe(false);
    expect(addPlaylistSongBody.safeParse({ songId: "s1", extra: true }).success).toBe(false);
  });
  it("reorderPlaylistSongsBody takes an array of non-empty ids", () => {
    expect(reorderPlaylistSongsBody.safeParse({ songIds: ["a", "b"] }).success).toBe(true);
    expect(reorderPlaylistSongsBody.safeParse({ songIds: [] }).success).toBe(true);
    expect(reorderPlaylistSongsBody.safeParse({ songIds: [""] }).success).toBe(false);
  });
});

describe("recordHistoryRequestSchema", () => {
  it("requires a non-empty songId", () => {
    expect(recordHistoryRequestSchema.safeParse({ songId: "s1" }).success).toBe(true);
    expect(recordHistoryRequestSchema.safeParse({ songId: "" }).success).toBe(false);
  });
});
