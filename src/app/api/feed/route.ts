import { z } from "zod";
import { authDataRoute } from "@/lib/route-handler";
import { buildActivityFeed } from "@/lib/activity";
import { zPageParam } from "@/lib/query-params";

const feedQuery = z.object({
  page: zPageParam(),
});

export const GET = authDataRoute(async (_request, { auth, query }) => {
  const result = await buildActivityFeed(auth.userId, query.page);
  return result;
}, { query: feedQuery });
