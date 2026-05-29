import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/llm", () => ({
  generateText: vi.fn(),
}));

import { generateText } from "@/lib/llm";
import {
  buildUserPrompt,
  generateAutoSongDetails,
  parseAutoGenerationResult,
} from "@/lib/generate-auto";

describe("generate-auto helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("buildUserPrompt includes favorite song context", () => {
    const prompt = buildUserPrompt("late night drive", [
      { title: "Midnight Echo", tags: "synthwave" },
      { title: null, tags: null },
    ]);

    expect(prompt).toContain("Description: late night drive");
    expect(prompt).toContain("\"Midnight Echo\" (synthwave)");
    expect(prompt).toContain("\"Untitled\"");
  });

  it("parseAutoGenerationResult returns normalized object", () => {
    const parsed = parseAutoGenerationResult(
      "preface\n{\"title\":\"Neon Tide\",\"style\":\"synthwave pop\",\"lyricsPrompt\":\"A late-night drive.\"}\ntrailer",
    );

    expect(parsed).toEqual({
      title: "Neon Tide",
      style: "synthwave pop",
      lyricsPrompt: "A late-night drive.",
    });
  });

  it("parseAutoGenerationResult returns null for invalid JSON", () => {
    expect(parseAutoGenerationResult("not-json")).toBeNull();
    expect(parseAutoGenerationResult(null)).toBeNull();
  });

  it("generateAutoSongDetails returns parsed output from LLM", async () => {
    vi.mocked(generateText).mockResolvedValue(
      '{"title":"Neon Tide","style":"synthwave pop","lyricsPrompt":"A late-night drive."}',
    );

    const result = await generateAutoSongDetails("late night drive", []);

    expect(result).toEqual({
      title: "Neon Tide",
      style: "synthwave pop",
      lyricsPrompt: "A late-night drive.",
    });
  });
});
