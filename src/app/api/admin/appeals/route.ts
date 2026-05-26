import { z } from "zod";
import { adminDataRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE, pageSkip, paginatedQuery } from "@/lib/pagination";
import { SELECT_USER_BRIEF } from "@/lib/prisma-selects";
import { zEnumParam, zPageParam } from "@/lib/query-params";

const appealsQuery = z.object({
  status: zEnumParam(["pending", "approved", "rejected", "all"] as const, "pending"),
  page: zPageParam(1),
});

export const GET = adminDataRoute<Record<string, never>, undefined, z.infer<typeof appealsQuery>>(async (_request, { query }) => {
  const { status, page } = query;

  const where = status === "all" ? {} : { status };

  const { items: appeals, ...pagination } = await paginatedQuery({
    findMany: () => prisma.appeal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, DEFAULT_PAGE_SIZE),
      take: DEFAULT_PAGE_SIZE,
      include: {
        song: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            isHidden: true,
            reports: {
              where: { status: { in: ["pending", "actioned"] } },
              select: { reason: true, adminNote: true },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
        user: { select: SELECT_USER_BRIEF },
      },
    }),
    count: () => prisma.appeal.count({ where }),
    page,
    limit: DEFAULT_PAGE_SIZE,
  });

  return { appeals, ...pagination };
}, { route: "/api/admin/appeals", query: appealsQuery });
