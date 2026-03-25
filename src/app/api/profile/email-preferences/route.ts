import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
  const { userId, error: authError } = await resolveUser(request);
  if (authError) return authError;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailWelcome: true, emailGenerationComplete: true, emailWeeklyHighlights: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    emailWelcome: user.emailWelcome,
    emailGenerationComplete: user.emailGenerationComplete,
    emailWeeklyHighlights: user.emailWeeklyHighlights,
  });
}

export async function PATCH(request: Request) {
  const { userId, error: authError } = await resolveUser(request);
  if (authError) return authError;

  const body = await request.json();
  const { emailWelcome, emailGenerationComplete, emailWeeklyHighlights } = body;

  const data: Record<string, unknown> = {};

  if (emailWelcome !== undefined) {
    if (typeof emailWelcome !== "boolean") {
      return NextResponse.json({ error: "emailWelcome must be a boolean", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    data.emailWelcome = emailWelcome;
  }

  if (emailGenerationComplete !== undefined) {
    if (typeof emailGenerationComplete !== "boolean") {
      return NextResponse.json({ error: "emailGenerationComplete must be a boolean", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    data.emailGenerationComplete = emailGenerationComplete;
  }

  if (emailWeeklyHighlights !== undefined) {
    if (typeof emailWeeklyHighlights !== "boolean") {
      return NextResponse.json({ error: "emailWeeklyHighlights must be a boolean", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    data.emailWeeklyHighlights = emailWeeklyHighlights;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  // Ensure user has an unsubscribe token
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { unsubscribeToken: true },
  });
  if (!existing?.unsubscribeToken) {
    data.unsubscribeToken = crypto.randomUUID();
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { emailWelcome: true, emailGenerationComplete: true, emailWeeklyHighlights: true },
  });

  return NextResponse.json({
    emailWelcome: user.emailWelcome,
    emailGenerationComplete: user.emailGenerationComplete,
    emailWeeklyHighlights: user.emailWeeklyHighlights,
  });
}
