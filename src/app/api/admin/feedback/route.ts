import { z } from "zod";
import { adminDataRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE, pageSkip, paginatedQuery } from "@/lib/pagination";
import { SELECT_USER_BRIEF } from "@/lib/prisma-selects";
import { zIntParam, zPageParam, zTrimmedParam } from "@/lib/query-params";

const feedbackQuery = z.object({
  category: zTrimmedParam,
  score: zIntParam,
  page: zPageParam(1),
});

export const GET = adminDataRoute<Record<string, never>, undefined, z.infer<typeof feedbackQuery>>(async (_request, { query }) => {
  const { category, score, page } = query;

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (typeof score === "number") where.score = score;

  const { items: feedbacks, ...pagination } = await paginatedQuery({
    findMany: () => prisma.userFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, DEFAULT_PAGE_SIZE),
      take: DEFAULT_PAGE_SIZE,
      include: {
        user: { select: SELECT_USER_BRIEF },
      },
    }),
    count: () => prisma.userFeedback.count({ where }),
    page,
    limit: DEFAULT_PAGE_SIZE,
  });

  return { feedbacks, ...pagination };
}, { route: "/api/admin/feedback", query: feedbackQuery });
