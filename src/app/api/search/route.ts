import { NextResponse } from "next/server";
import { authRoute } from "@/lib/route-handler";
import { CacheControl } from "@/lib/cache";
import { searchUserContent } from "@/lib/search";

export const GET = authRoute(async (request, { auth }) => {
  const q = request.nextUrl.searchParams.get("q") || "";

  const result = await searchUserContent(auth.userId, q);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data, {
    headers: { "Cache-Control": CacheControl.privateNoCache },
  });
});
