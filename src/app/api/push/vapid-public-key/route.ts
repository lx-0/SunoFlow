import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

// GET /api/push/vapid-public-key — return the VAPID public key for client subscription
export async function GET() {
  const key = getVapidPublicKey();
  // Return 200 with null key when not configured — the client already handles
  // this case gracefully, and returning 503 triggers noisy browser console errors.
  return NextResponse.json({ key: key ?? null });
}
