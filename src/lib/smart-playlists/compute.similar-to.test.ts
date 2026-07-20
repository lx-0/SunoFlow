import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() {
    return "postgres://test:test@localhost:5432/test";
  },
  env: {},
}));

const mockEmbeddingFindUnique = vi.fn();
const mockEmbeddingFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    songEmbedding: {
      findUnique: (...a: unknown[]) => mockEmbeddingFindUnique(...a),
      findMany: (...a: unknown[]) => mockEmbeddingFindMany(...a),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { computeSmartPlaylistSongs } from "./compute";

const SOURCE = "source-song";

describe("computeSmartPlaylistSongs similar_to malformed embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Source embedding: a valid 3-dim vector strongly aligned with candidate B.
    mockEmbeddingFindUnique.mockResolvedValue({ embedding: [1, 0, 0] });
  });

  it("skips malformed candidate rows instead of throwing, and still ranks valid rows", async () => {
    mockEmbeddingFindMany.mockResolvedValue([
      { songId: "null-embedding", embedding: null }, // JSON-null → would crash on .length
      { songId: "object-embedding", embedding: { not: "an array" } }, // non-array → not iterable
      { songId: "valid-far", embedding: [0, 1, 0] }, // orthogonal, low score
      { songId: "valid-near", embedding: [1, 0, 0] }, // aligned, high score
    ]);

    const result = await computeSmartPlaylistSongs("user-1", "similar_to", {
      sourceSongId: SOURCE,
    });

    // Malformed rows are dropped entirely.
    expect(result).not.toContain("null-embedding");
    expect(result).not.toContain("object-embedding");
    // Valid rows survive and rank by similarity (near before far).
    expect(result).toEqual(["valid-near", "valid-far"]);
  });

  it("returns [] when the source embedding is malformed (JSON-null)", async () => {
    mockEmbeddingFindUnique.mockResolvedValue({ embedding: null });
    mockEmbeddingFindMany.mockResolvedValue([{ songId: "valid", embedding: [1, 0, 0] }]);

    const result = await computeSmartPlaylistSongs("user-1", "similar_to", {
      sourceSongId: SOURCE,
    });

    expect(result).toEqual([]);
    // Never queried candidates once the source failed to parse.
    expect(mockEmbeddingFindMany).not.toHaveBeenCalled();
  });
});
