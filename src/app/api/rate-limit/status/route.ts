import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { status } = await checkRateLimit(userId);

    // Usage history: daily generation count for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const entries = await prisma.rateLimitEntry.findMany({
      where: {
        userId,
        action: "generate",
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Build daily counts for last 7 days
    const dailyCounts: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dailyCounts.push({ date: dateStr, count: 0 });
    }

    for (const entry of entries) {
      const dateStr = entry.createdAt.toISOString().slice(0, 10);
      const bucket = dailyCounts.find((d) => d.date === dateStr);
      if (bucket) bucket.count++;
    }

    const used = status.limit - status.remaining;
    const percentUsed = status.limit > 0 ? Math.round((used / status.limit) * 100) : 0;

    return NextResponse.json({
      remaining: status.remaining,
      limit: status.limit,
      used,
      percentUsed,
      resetAt: status.resetAt,
      dailyCounts,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
