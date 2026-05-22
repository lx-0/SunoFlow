import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePromptsFromFeeds } from "./generate";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    rssFeedSubscription: {
      findMany: vi.fn(),
    },
    promptTemplate: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/rss", () => ({
  fetchFeed: vi.fn(),
}));

vi.mock("@/lib/sunoapi", () => ({
  resolveUserApiKey: vi.fn(),
  boostStyle: vi.fn(),
}));

describe("generatePromptsFromFeeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error when user has no feed subscriptions", async () => {
    mockPrisma.rssFeedSubscription.findMany.mockResolvedValue([]);

    const result = await generatePromptsFromFeeds("u1");

    expect(result).toEqual({
      ok: false,
      error: "No RSS feeds configured. Add feeds in Settings first.",
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("returns validation error when feeds provide no parsable items", async () => {
    const { fetchFeed } = await import("@/lib/rss");
    mockPrisma.rssFeedSubscription.findMany.mockResolvedValue([{ url: "https://example.com/feed.xml" }]);
    vi.mocked(fetchFeed).mockResolvedValue({
      url: "https://example.com/feed.xml",
      feedTitle: "Example Feed",
      items: [],
      error: "unreachable",
    });

    const result = await generatePromptsFromFeeds("u1");

    expect(result).toEqual({
      ok: false,
      error: "No feed items found. Your RSS feeds may be empty or unreachable.",
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("creates templates and returns prompts payload on success", async () => {
    const { fetchFeed } = await import("@/lib/rss");
    const now = new Date("2026-01-01T00:00:00.000Z");
    mockPrisma.rssFeedSubscription.findMany.mockResolvedValue([{ url: "https://example.com/feed.xml" }]);
    vi.mocked(fetchFeed).mockResolvedValue({
      url: "https://example.com/feed.xml",
      feedTitle: "Example Feed",
      items: [
        {
          title: "A long title for ranking",
          description:
            "A sufficiently long description so buildPromptFromItem returns a narrative prompt for creation.",
          excerpt: "Short excerpt",
          topics: ["music"],
          mood: "uplifting",
        },
      ],
    });
    mockPrisma.promptTemplate.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.promptTemplate.create.mockResolvedValue({
      id: "pt_1",
      userId: "u1",
      name: "A long title for ranking",
      description: "Auto-generated from your feed content",
      prompt: "Generated prompt",
      style: "uplifting, music",
      category: "auto-generated",
      isInstrumental: false,
      isBuiltIn: false,
      createdAt: now,
    });

    const result = await generatePromptsFromFeeds("u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.prompts).toHaveLength(1);
    expect(result.data.prompts[0]).toMatchObject({
      id: "pt_1",
      userId: "u1",
      category: "auto-generated",
      excerpt: "Short excerpt",
    });
    expect(mockPrisma.promptTemplate.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", category: "auto-generated" },
    });
  });
});
