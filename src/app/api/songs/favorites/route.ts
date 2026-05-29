import { NextResponse } from "next/server";
import { authDataRoute } from "@/lib/route-handler";
import { CacheControl } from "@/lib/cache";
import { listFavorites } from "@/lib/songs";
import {
  zCursorPaginationQuery,
  zTrimmedParam,
  zEnumParam,
} from "@/lib/query-params";

const favoritesQuery = zCursorPaginationQuery(20, 100).extend({
  q: zTrimmedParam,
  status: zTrimmedParam,
  sortBy: zEnumParam(
    ["recently_liked", "newest", "oldest", "title_az"] as const,
    "recently_liked",
  ),
});

export const GET = authDataRoute(async (_request, { auth, query }) => {
  const result = await listFavorites({
    userId: auth.userId,
    search: query.q,
    status: query.status,
    sortBy: query.sortBy,
    limit: query.limit,
    cursor: query.cursor,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": CacheControl.privateNoCache },
  });
}, { route: "/api/songs/favorites", query: favoritesQuery });
