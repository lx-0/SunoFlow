import { describe, expect, it } from "vitest";
import {
  addSongTagBodySchema,
  createTagBodySchema,
  updateTagBodySchema,
} from "@/lib/tags/request";

describe("tags request schemas", () => {
  it("accepts optional create tag fields", () => {
    const result = createTagBodySchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts optional update tag fields", () => {
    const result = updateTagBodySchema.parse({ color: "#111111" });
    expect(result).toEqual({ color: "#111111" });
  });

  it("accepts either tagId or name for song tag payload", () => {
    expect(addSongTagBodySchema.parse({ tagId: "tag_1" })).toEqual({
      tagId: "tag_1",
    });
    expect(addSongTagBodySchema.parse({ name: "chill" })).toEqual({
      name: "chill",
    });
  });
});
