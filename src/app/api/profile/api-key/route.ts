import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { sunoApiKey: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Return masked key so the full key is never exposed to the client after saving
  const hasKey = Boolean(user.sunoApiKey);
  const maskedKey = user.sunoApiKey
    ? user.sunoApiKey.slice(0, 4) + "…" + user.sunoApiKey.slice(-4)
    : null;

  return NextResponse.json({ hasKey, maskedKey });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sunoApiKey } = await request.json();

  if (typeof sunoApiKey !== "string") {
    return NextResponse.json(
      { error: "sunoApiKey must be a string" },
      { status: 400 }
    );
  }

  // Empty string means "remove key"
  const keyValue = sunoApiKey.trim() || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { sunoApiKey: keyValue },
  });

  const hasKey = Boolean(keyValue);
  const maskedKey = keyValue
    ? keyValue.slice(0, 4) + "…" + keyValue.slice(-4)
    : null;

  return NextResponse.json({ hasKey, maskedKey });
}
