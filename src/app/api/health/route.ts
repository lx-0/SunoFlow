import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getMetricsSnapshot } from "@/lib/metrics";

const startedAt = Date.now();

export async function GET() {
  const uptime = Math.floor((Date.now() - startedAt) / 1000);
  try {
    await prisma.$queryRaw`SELECT 1`;
    const metrics = getMetricsSnapshot();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      db: true,
      uptime,
      generation: {
        queueDepth: metrics.generation.queueDepth,
        total: metrics.generation.total,
        completed: metrics.generation.completed,
        failed: metrics.generation.failed,
      },
    });
  } catch {
    return NextResponse.json(
      { status: "error", db: false, uptime },
      { status: 503 }
    );
  }
}
