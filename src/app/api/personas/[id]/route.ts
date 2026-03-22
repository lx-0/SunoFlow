import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/error-logger";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const persona = await prisma.persona.findUnique({ where: { id } });
    if (!persona || persona.userId !== session.user.id) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    await prisma.persona.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logServerError("personas-delete", error, { route: "/api/personas/[id]" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
