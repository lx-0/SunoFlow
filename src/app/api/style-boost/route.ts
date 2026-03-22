import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { boostStyle, SunoApiError } from "@/lib/sunoapi";
import { resolveUserApiKey } from "@/lib/sunoapi/resolve-key";
import { logServerError } from "@/lib/error-logger";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "A style description is required" },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: "Style description must be 500 characters or less" },
        { status: 400 }
      );
    }

    const userApiKey = await resolveUserApiKey(session.user.id);
    const result = await boostStyle(content.trim(), userApiKey);

    return NextResponse.json({
      result: result.result,
      creditsConsumed: result.creditsConsumed,
      creditsRemaining: result.creditsRemaining,
    });
  } catch (error) {
    if (error instanceof SunoApiError) {
      logServerError("style-boost-api", error, { route: "/api/style-boost" });
      return NextResponse.json(
        { error: "Style boost failed. Please try again." },
        { status: error.status >= 500 ? 502 : error.status }
      );
    }
    logServerError("style-boost", error, { route: "/api/style-boost" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
