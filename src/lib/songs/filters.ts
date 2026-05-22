import { Prisma } from "@prisma/client";

function appendAndConditions(
  base: Prisma.SongWhereInput,
  ...conditions: Prisma.SongWhereInput[]
): Prisma.SongWhereInput {
  if (conditions.length === 0) return base;
  const existing = base.AND
    ? Array.isArray(base.AND)
      ? base.AND
      : [base.AND]
    : [];
  return {
    ...base,
    AND: [...existing, ...conditions],
  };
}

export const SongFilters = {
  userLibrary(userId: string): Prisma.SongWhereInput {
    return {
      userId,
      parentSongId: null,
      archivedAt: null,
    };
  },

  userArchived(userId: string): Prisma.SongWhereInput {
    return {
      userId,
      parentSongId: null,
      archivedAt: { not: null },
    };
  },

  publicDiscovery(): Prisma.SongWhereInput {
    return {
      isPublic: true,
      isHidden: false,
      archivedAt: null,
      generationStatus: "ready",
    };
  },

  variantFamily(rootId: string): Prisma.SongWhereInput {
    return {
      OR: [{ id: rootId }, { parentSongId: rootId }],
      generationStatus: "ready",
      archivedAt: null,
      isHidden: false,
    };
  },

  ownedBy(userId: string, songId: string): Prisma.SongWhereInput {
    return { id: songId, userId };
  },

  ready(): Prisma.SongWhereInput {
    return { generationStatus: "ready" };
  },

  withTagContains(
    base: Prisma.SongWhereInput,
    values: string[]
  ): Prisma.SongWhereInput {
    if (values.length === 0) return base;
    const conditions = values.map((v) => ({
      tags: { contains: v, mode: "insensitive" as const },
    }));
    return appendAndConditions(base, { OR: conditions });
  },

  withSongTags(
    base: Prisma.SongWhereInput,
    tagIds: string[]
  ): Prisma.SongWhereInput {
    if (tagIds.length === 0) return base;
    if (tagIds.length === 1) {
      return { ...base, songTags: { some: { tagId: tagIds[0] } } };
    }
    return appendAndConditions(
      base,
      ...tagIds.map((tid) => ({ songTags: { some: { tagId: tid } } }))
    );
  },

  withTagFilters(
    base: Prisma.SongWhereInput,
    genre?: string,
    mood?: string
  ): Prisma.SongWhereInput {
    if (!genre && !mood) return base;
    if (genre && mood) {
      return appendAndConditions(
        base,
        { tags: { contains: genre, mode: "insensitive" } },
        { tags: { contains: mood, mode: "insensitive" } },
      );
    }
    return {
      ...base,
      tags: { contains: (genre || mood)!, mode: "insensitive" },
    };
  },

  discoverable(): Prisma.SongWhereInput {
    return {
      generationStatus: "ready",
      audioUrl: { not: null },
      archivedAt: null,
    };
  },

  withTempoRange(
    base: Prisma.SongWhereInput,
    tempoMin?: number,
    tempoMax?: number
  ): Prisma.SongWhereInput {
    if (!tempoMin && !tempoMax) return base;
    const tempo: Prisma.IntNullableFilter = {};
    if (tempoMin) tempo.gte = tempoMin;
    if (tempoMax) tempo.lte = tempoMax;
    return { ...base, tempo };
  },

  withExcludeIds(
    base: Prisma.SongWhereInput,
    ids: string[]
  ): Prisma.SongWhereInput {
    if (ids.length === 0) return base;
    return { ...base, id: { notIn: ids } };
  },
} as const;
