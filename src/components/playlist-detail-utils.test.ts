import { describe, expect, it } from "vitest";
import {
  buildPlaylistEmbedCode,
  buildPlaylistEmbedUrl,
  buildPublicPlaylistUrl,
  reorderByIndex,
} from "./playlist-detail-utils";

describe("reorderByIndex", () => {
  it("moves an item to a new index", () => {
    expect(reorderByIndex(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("returns original items when indices are invalid", () => {
    const items = ["a", "b", "c"];
    expect(reorderByIndex(items, -1, 2)).toEqual(items);
    expect(reorderByIndex(items, 1, 9)).toEqual(items);
  });

  it("returns original items when from and to are equal", () => {
    const items = ["a", "b", "c"];
    expect(reorderByIndex(items, 1, 1)).toBe(items);
  });
});

describe("playlist urls", () => {
  it("builds public playlist url", () => {
    expect(buildPublicPlaylistUrl("https://app.example.com", "mix-1")).toBe(
      "https://app.example.com/p/mix-1",
    );
  });

  it("builds embed playlist url", () => {
    expect(buildPlaylistEmbedUrl("https://app.example.com", "mix-1")).toBe(
      "https://app.example.com/embed/playlist/mix-1",
    );
  });

  it("builds embed iframe code", () => {
    expect(buildPlaylistEmbedCode("https://app.example.com", "mix-1")).toContain(
      "https://app.example.com/embed/playlist/mix-1",
    );
  });
});
