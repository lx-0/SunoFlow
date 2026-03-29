import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId, error: authError } = await resolveUser(request);

    if (authError) return authError;

    const tag = await prisma.tag.findFirst({
      where: { id, userId: userId },
    });
    if (!tag) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim().toLowerCase() : undefined;
    const color = typeof body.color === "string" ? body.color.trim() : undefined;

    if (name !== undefined && (!name || name.length > 50)) {
      return NextResponse.json({ error: "Tag name is required (max 50 chars)", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    // Check duplicate name if renaming
    if (name && name !== tag.name) {
      const existing = await prisma.tag.findUnique({
        where: { userId_name: { userId: userId, name } },
      });
      if (existing) {
        return NextResponse.json({ error: "A tag with that name already exists", code: "CONFLICT" }, { status: 409 });
      }
    }

    const updated = await prisma.tag.update({
      where: { id: tag.id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json({ tag: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId, error: authError } = await resolveUser(request);

    if (authError) return authError;

    const tag = await prisma.tag.findFirst({
      where: { id, userId: userId },
    });
    if (!tag) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.tag.delete({ where: { id: tag.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
