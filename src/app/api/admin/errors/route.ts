import { z } from "zod";
import { adminDataRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { pageSkip, paginatedQuery } from "@/lib/pagination";
import { zPaginationQuery } from "@/lib/query-params";

const errorsQuery = zPaginationQuery(50, 100);

export const GET = adminDataRoute<Record<string, never>, undefined, z.infer<typeof errorsQuery>>(async (_request, { query }) => {
  const { page, limit } = query;

  const { items: errors, ...pagination } = await paginatedQuery({
    findMany: () => prisma.errorReport.findMany({
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, limit),
      take: limit,
    }),
    count: () => prisma.errorReport.count(),
    page,
    limit,
  });

  return { errors, ...pagination };
}, { route: "/api/admin/errors", query: errorsQuery });
