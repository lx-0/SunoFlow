import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { userId, error: authError } = await resolveUser(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10)));
  const skip = (page - 1) * limit;

  const [digests, total] = await Promise.all([
    prisma.inspirationDigest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: { id: true, title: true, items: true, createdAt: true },
    }),
    prisma.inspirationDigest.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    digests,
    total,
    hasMore: skip + digests.length < total,
  });
}
