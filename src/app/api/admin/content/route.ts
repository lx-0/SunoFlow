import { z } from "zod";
import { adminDataRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { pageSkip, paginatedQuery } from "@/lib/pagination";
import { SELECT_USER_BRIEF } from "@/lib/prisma-selects";
import { zEnumParam, zPaginationQuery } from "@/lib/query-params";

const contentQuery = zPaginationQuery(20, 100).extend({
  filter: zEnumParam(["all", "flagged", "public"] as const, "all"),
});

export const GET = adminDataRoute<Record<string, never>, undefined, z.infer<typeof contentQuery>>(async (_request, { query }) => {
  const { page, limit, filter } = query;

  const where =
    filter === "flagged"
      ? { isHidden: true }
      : filter === "public"
      ? { isPublic: true, isHidden: false }
      : {};

  const { items: songs, ...pagination } = await paginatedQuery({
    findMany: () => prisma.song.findMany({
      where,
      select: {
        id: true,
        title: true,
        generationStatus: true,
        isPublic: true,
        isHidden: true,
        createdAt: true,
        user: { select: SELECT_USER_BRIEF },
        _count: { select: { reports: { where: { status: "pending" } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, limit),
      take: limit,
    }),
    count: () => prisma.song.count({ where }),
    page,
    limit,
    transform: (songs) => songs.map((s) => ({
      id: s.id,
      title: s.title,
      generationStatus: s.generationStatus,
      isPublic: s.isPublic,
      isHidden: s.isHidden,
      createdAt: s.createdAt,
      creator: { id: s.user.id, name: s.user.name, email: s.user.email },
      pendingReports: s._count.reports,
    })),
  });

  return { songs, ...pagination };
}, { route: "/api/admin/content", query: contentQuery });
