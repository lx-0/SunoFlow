import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MILESTONE_META } from "@/lib/streaks";
import { publicRoute } from "@/lib/route-handler";
import { resolveRouteUsernameOrResponse } from "../route-shared";

export const GET = publicRoute<{ username: string }>(async (_request, { params }) => {
  const user = await resolveRouteUsernameOrResponse(params.username);
  if ("status" in user) return user;

  const rows = await prisma.userMilestone.findMany({
    where: { userId: user.userId },
    orderBy: { earnedAt: "asc" },
  });

  const milestones = rows.map((m) => ({
    type: m.type,
    earnedAt: m.earnedAt.toISOString(),
    ...(MILESTONE_META[m.type as keyof typeof MILESTONE_META] ?? {
      label: m.type,
      description: "",
      emoji: "🏅",
    }),
  }));

  return NextResponse.json({ milestones });
}, { route: "/api/u/[username]/milestones" });
