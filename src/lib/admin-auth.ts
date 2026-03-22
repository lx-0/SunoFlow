import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null, user: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null, user: null };
  }

  return { error: null, session, user };
}

export async function logAdminAction(adminId: string, action: string, targetId?: string, details?: string) {
  await prisma.adminLog.create({
    data: { adminId, action, targetId, details },
  });
}
