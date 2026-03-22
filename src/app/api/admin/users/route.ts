import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" as const : "desc" as const;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const orderBy: Record<string, string> = {};
  if (sortBy === "generationCount") {
    // Handled separately
  } else if (["createdAt", "name", "email", "lastLoginAt"].includes(sortBy)) {
    orderBy[sortBy] = order;
  } else {
    orderBy.createdAt = order;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isDisabled: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { songs: true } },
      },
      orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isAdmin: u.isAdmin,
    isDisabled: u.isDisabled,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    generationCount: u._count.songs,
  }));

  if (sortBy === "generationCount") {
    result.sort((a, b) =>
      order === "asc"
        ? a.generationCount - b.generationCount
        : b.generationCount - a.generationCount
    );
  }

  return NextResponse.json({
    users: result,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
