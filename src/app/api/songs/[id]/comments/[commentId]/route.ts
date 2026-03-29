import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const [comment, song] = await Promise.all([
      prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, userId: true, songId: true },
      }),
      prisma.song.findUnique({
        where: { id },
        select: { userId: true },
      }),
    ]);

    if (!comment || comment.songId !== id) {
      return NextResponse.json(
        { error: "Comment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const isCommentOwner = comment.userId === session.user.id;
    const isSongOwner = song?.userId === session.user.id;

    if (!isCommentOwner && !isSongOwner) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
