import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_USER_TEMPLATES = 20;

// GET /api/prompt-templates — list built-in + user templates
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.promptTemplate.findMany({
      where: {
        OR: [{ isBuiltIn: true }, { userId: session.user.id }],
      },
      orderBy: [{ isBuiltIn: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/prompt-templates — create a user template
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { name, prompt, style, isInstrumental } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Enforce max 20 user templates
    const count = await prisma.promptTemplate.count({
      where: { userId, isBuiltIn: false },
    });
    if (count >= MAX_USER_TEMPLATES) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_USER_TEMPLATES} templates reached. Delete one to create a new one.` },
        { status: 400 }
      );
    }

    const template = await prisma.promptTemplate.create({
      data: {
        userId,
        name: name.trim(),
        prompt: prompt.trim(),
        style: style?.trim() || null,
        isInstrumental: Boolean(isInstrumental),
        isBuiltIn: false,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
