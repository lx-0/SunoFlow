import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

// GET /api/push/vapid-public-key — return the VAPID public key for client subscription
export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json(
      { error: "Push notifications not configured", code: "NOT_CONFIGURED" },
      { status: 503 }
    );
  }
  return NextResponse.json({ key });
}
