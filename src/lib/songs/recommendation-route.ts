import { NextResponse } from "next/server";
import { z } from "zod";
import { authRoute, publicRoute } from "@/lib/route-handler";
import { zLimitParam } from "@/lib/query-params";

export const recommendationQuerySchema = z.object({
  limit: zLimitParam(8, 8),
});

type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;

type AuthRecommendationFetcher<TSong> = (
  songId: string,
  userId: string,
  limit: number,
) => Promise<readonly TSong[] | null>;

type PublicRecommendationFetcher<TData> = (
  songId: string,
  limit: number,
) => Promise<TData | null>;

export function createAuthRecommendationRoute<TSong>(
  fetchRecommendations: AuthRecommendationFetcher<TSong>,
  route: string,
) {
  return authRoute<{ id: string }, undefined, RecommendationQuery>(
    async (_request, { auth, params, query }) => {
      const songs = await fetchRecommendations(params.id, auth.userId, query.limit);
      if (songs === null) {
        return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
      }

      return NextResponse.json({ songs, total: songs.length });
    },
    { route, query: recommendationQuerySchema },
  );
}

export function createPublicRecommendationRoute<TData, TSong>(
  fetchRecommendations: PublicRecommendationFetcher<TData>,
  formatResponse: (data: TData) => { songs: readonly TSong[]; source?: string },
  route: string,
) {
  return publicRoute<{ id: string }, undefined, RecommendationQuery>(
    async (_request, { params, query }) => {
      const data = await fetchRecommendations(params.id, query.limit);
      if (data === null) {
        return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
      }

      const response = formatResponse(data);
      return NextResponse.json({
        songs: response.songs,
        total: response.songs.length,
        ...(response.source ? { source: response.source } : {}),
      });
    },
    { route, query: recommendationQuerySchema },
  );
}
