import { NextResponse } from "next/server";
import { publicRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE, offsetPagination, pageSkip } from "@/lib/pagination";
import { buildDiscoverableFilter } from "@/lib/songs";
import { pageQuery, resolveRouteUsernameOrResponse } from "../route-shared";

export const GET = publicRoute<{ username: string }, undefined, { page: number }>(
  async (_request, { params, query }) => {
    const user = await resolveRouteUsernameOrResponse(params.username);
    if ("status" in user) return user;

    const where = { ...buildDiscoverableFilter(), userId: user.userId };

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pageSkip(query.page, DEFAULT_PAGE_SIZE),
        take: DEFAULT_PAGE_SIZE,
        select: {
          id: true,
          title: true,
          imageUrl: true,
          audioUrl: true,
          duration: true,
          tags: true,
          publicSlug: true,
          playCount: true,
          createdAt: true,
        },
      }),
      prisma.song.count({ where }),
    ]);

    return NextResponse.json({
      songs,
      pagination: offsetPagination(query.page, DEFAULT_PAGE_SIZE, total),
    });
  },
  { query: pageQuery, route: "/api/u/[username]/songs" }
);
