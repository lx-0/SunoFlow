import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORY = "auto-generated";

/**
 * GET /api/prompts/daily
 *
 * Returns the user's auto-generated prompt templates (daily inspiration queue).
 * If none exist yet, returns an empty array — the client should call
 * POST /api/prompts/generate to populate them.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prompts = await prisma.promptTemplate.findMany({
      where: {
        userId: session.user.id,
        category: CATEGORY,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Include staleness info — prompts older than 24h should be refreshed
    const stale =
      prompts.length === 0 ||
      prompts.some(
        (p) => Date.now() - new Date(p.createdAt).getTime() > 24 * 60 * 60 * 1000
      );

    return NextResponse.json({ prompts, stale });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
