import { z } from "zod";
import { publicDataRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { buildDiscoverableFilter } from "@/lib/songs";
import {
  isRouteResponse,
  pageQuery,
  pagedResponse,
  pageSlice,
  publicProfileSongSelect,
  resolveRouteUsernameOrResponse,
} from "../route-shared";

export const GET = publicDataRoute<{ username: string }, undefined, z.infer<typeof pageQuery>>(
  async (_request, { params, query }) => {
    const user = await resolveRouteUsernameOrResponse(params.username);
    if (isRouteResponse(user)) return user;

    const where = {
      userId: user.userId,
      song: buildDiscoverableFilter(),
    };

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageSlice(query.page),
        select: {
          song: {
            select: publicProfileSongSelect,
          },
        },
      }),
      prisma.favorite.count({ where }),
    ]);

    return {
      songs: favorites.map((f) => f.song),
      pagination: pagedResponse(query.page, total),
    };
  },
  { query: pageQuery, route: "/api/u/[username]/liked-songs" }
);
