import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalGenerations, generationsToday, activeUsers, pendingReports, recentErrors] = await Promise.all([
    prisma.user.count(),
    prisma.song.count(),
    prisma.song.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.report.count({ where: { status: "pending" } }),
    prisma.errorReport.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

  // Daily generation volume for last 30 days
  const dailyGenerations = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
    SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
    FROM "Song"
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const chartData = dailyGenerations.map((row) => ({
    date: new Date(row.date).toISOString().split("T")[0],
    count: Number(row.count),
  }));

  return NextResponse.json({
    totalUsers,
    totalGenerations,
    generationsToday,
    activeUsers,
    pendingReports,
    recentErrors,
    dailyGenerations: chartData,
  });
}
