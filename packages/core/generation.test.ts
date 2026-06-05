import { describe, it, expect } from "vitest";
import {
  generateSongRequestSchema,
  isTerminalGenerationStatus,
  GENERATION_STATUS,
  MIN_BATCH_SIZE,
  MAX_BATCH_SIZE,
  GENERATION_PROMPT_MAX_LENGTH,
  GENERATION_TITLE_MAX_LENGTH,
} from "./generation";

describe("generateSongRequestSchema", () => {
  it("accepts a minimal valid body and trims the prompt", () => {
    const parsed = generateSongRequestSchema.parse({ prompt: "  rock anthem  " });
    expect(parsed.prompt).toBe("rock anthem");
  });

  it("requires a non-empty prompt (after trim)", () => {
    expect(generateSongRequestSchema.safeParse({ prompt: "" }).success).toBe(false);
    expect(generateSongRequestSchema.safeParse({ prompt: "   " }).success).toBe(false);
  });

  it("enforces the field length limits", () => {
    expect(generateSongRequestSchema.safeParse({ prompt: "a".repeat(GENERATION_PROMPT_MAX_LENGTH + 1) }).success).toBe(false);
    expect(generateSongRequestSchema.safeParse({ prompt: "ok", title: "a".repeat(GENERATION_TITLE_MAX_LENGTH + 1) }).success).toBe(false);
  });

  it("accepts the optional fields", () => {
    const parsed = generateSongRequestSchema.parse({
      prompt: "rock",
      title: "My Song",
      tags: "rock, loud",
      makeInstrumental: true,
      personaId: "p1",
      parentSongId: "s1",
    });
    expect(parsed.makeInstrumental).toBe(true);
    expect(parsed.parentSongId).toBe("s1");
  });
});

describe("isTerminalGenerationStatus", () => {
  it("is true only for ready / failed", () => {
    expect(isTerminalGenerationStatus(GENERATION_STATUS.READY)).toBe(true);
    expect(isTerminalGenerationStatus(GENERATION_STATUS.FAILED)).toBe(true);
    expect(isTerminalGenerationStatus(GENERATION_STATUS.PENDING)).toBe(false);
    expect(isTerminalGenerationStatus(GENERATION_STATUS.PROCESSING)).toBe(false);
  });
  it("is false for nullish / unknown / wrong-case", () => {
    expect(isTerminalGenerationStatus(null)).toBe(false);
    expect(isTerminalGenerationStatus(undefined)).toBe(false);
    expect(isTerminalGenerationStatus("READY")).toBe(false);
  });
});

describe("batch bounds", () => {
  it("are 2..5", () => {
    expect(MIN_BATCH_SIZE).toBe(2);
    expect(MAX_BATCH_SIZE).toBe(5);
  });
});
