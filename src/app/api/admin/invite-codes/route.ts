import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { adminRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/auth";
import { generateInviteCode } from "@/lib/auth/invite";

const createBody = z.object({
  count: z.number().int().min(1).max(50).optional(),
  note: z.string().max(200).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const GET = adminRoute(async () => {
  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { usedByUser: { select: { email: true, name: true } } },
  });
  return NextResponse.json({ codes });
});

export const POST = adminRoute<Record<string, never>, z.infer<typeof createBody>>(
  async (_request, { admin, body }) => {
    const count = body.count ?? 1;
    const note = body.note?.trim() || null;
    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const created: { id: string; code: string }[] = [];
    for (let i = 0; i < count; i++) {
      created.push(await createUniqueCode(admin.adminId, note, expiresAt));
    }

    await logAdminAction(admin.adminId, "invite_code.generate", undefined, `count=${count}`);
    return NextResponse.json({ codes: created }, { status: 201 });
  },
  { route: "/api/admin/invite-codes", body: createBody },
);

async function createUniqueCode(
  createdById: string,
  note: string | null,
  expiresAt: Date | null,
): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.inviteCode.create({
        data: { code: generateInviteCode(), note, expiresAt, createdById },
        select: { id: true, code: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to generate a unique invite code after 5 attempts");
}
