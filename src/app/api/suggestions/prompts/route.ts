import { NextResponse } from "next/server";
import { authDataRoute } from "@/lib/route-handler";
import { CacheControl } from "@/lib/cache";
import { getPromptSuggestions } from "@/lib/suggestions";

export const GET = authDataRoute(async (_request, { auth }) => {
  const suggestions = await getPromptSuggestions(auth.userId);
  return NextResponse.json({ suggestions }, {
    headers: { "Cache-Control": CacheControl.privateShort },
  });
});
