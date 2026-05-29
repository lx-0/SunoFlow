import { z } from "zod";
import { adminDataRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { pageSkip, paginatedQuery } from "@/lib/pagination";
import { zPaginationQuery } from "@/lib/query-params";

const logsQuery = zPaginationQuery(50, 100);

export const GET = adminDataRoute<Record<string, never>, undefined, z.infer<typeof logsQuery>>(async (_request, { query }) => {
  const { page, limit } = query;

  const { items: logs, ...pagination } = await paginatedQuery({
    findMany: () => prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, limit),
      take: limit,
      include: {
        admin: { select: { name: true, email: true } },
      },
    }),
    count: () => prisma.adminLog.count(),
    page,
    limit,
  });

  return { logs, ...pagination };
}, { route: "/api/admin/logs", query: logsQuery });
