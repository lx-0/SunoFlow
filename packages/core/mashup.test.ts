import { describe, it, expect } from "vitest";
import { mashupRequestSchema } from "./mashup";

describe("mashupRequestSchema", () => {
  it("accepts two tracks referenced by songId", () => {
    expect(
      mashupRequestSchema.safeParse({ trackA: { songId: "a" }, trackB: { songId: "b" } }).success,
    ).toBe(true);
  });

  it("accepts mixed sources (songId + fileUrl) and optional fields", () => {
    const r = mashupRequestSchema.safeParse({
      trackA: { songId: "a" },
      trackB: { fileUrl: "https://x/b.mp3" },
      title: "Mash",
      instrumental: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a track with no source", () => {
    expect(mashupRequestSchema.safeParse({ trackA: {}, trackB: { songId: "b" } }).success).toBe(false);
  });

  it("rejects a non-URL fileUrl", () => {
    expect(
      mashupRequestSchema.safeParse({ trackA: { fileUrl: "not-a-url" }, trackB: { songId: "b" } }).success,
    ).toBe(false);
  });
});
