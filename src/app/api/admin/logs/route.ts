import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { offsetPagination, pageSkip } from "@/lib/pagination";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, limit),
      take: limit,
      include: {
        admin: { select: { name: true, email: true } },
      },
    }),
    prisma.adminLog.count(),
  ]);

  return NextResponse.json({
    logs,
    ...offsetPagination(page, limit, total),
  });
}
