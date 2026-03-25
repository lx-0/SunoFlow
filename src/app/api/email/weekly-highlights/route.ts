import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyHighlightsEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Internal-only endpoint for triggering weekly highlight emails.
// Must be protected by CRON_SECRET to prevent abuse.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find all users who have weekly highlights enabled
  const users = await prisma.user.findMany({
    where: { emailWeeklyHighlights: true, email: { not: null } },
    select: {
      id: true,
      email: true,
      unsubscribeToken: true,
      _count: { select: { songs: true } },
    },
  });

  let sent = 0;
  let errors = 0;

  for (const user of users) {
    if (!user.email) continue;

    try {
      // Ensure unsubscribe token exists
      let unsubToken = user.unsubscribeToken;
      if (!unsubToken) {
        unsubToken = crypto.randomUUID();
        await prisma.user.update({
          where: { id: user.id },
          data: { unsubscribeToken: unsubToken },
        });
      }

      // Get songs generated this week
      const weekGenerations = await prisma.song.count({
        where: { userId: user.id, createdAt: { gte: weekAgo }, generationStatus: "ready" },
      });

      // Get top songs by play count from this week
      const topSongs = await prisma.song.findMany({
        where: { userId: user.id, generationStatus: "ready", createdAt: { gte: weekAgo } },
        orderBy: { playCount: "desc" },
        take: 5,
        select: { id: true, title: true, playCount: true },
      });

      await sendWeeklyHighlightsEmail(
        user.email,
        { topSongs, totalSongs: user._count.songs, weekGenerations },
        unsubToken
      );
      sent++;
    } catch (err) {
      logger.error({ userId: user.id, err }, "weekly-highlights: failed to send email");
      errors++;
    }
  }

  logger.info({ sent, errors, total: users.length }, "weekly-highlights: batch complete");
  return NextResponse.json({ sent, errors, total: users.length });
}
