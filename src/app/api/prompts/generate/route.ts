import { NextResponse } from "next/server";
import { authRoute, resultResponse } from "@/lib/route-handler";
import { logServerError } from "@/lib/error-logger";
import { internalError } from "@/lib/api-error";
import { generatePromptsFromFeeds } from "@/lib/prompts";

export const POST = authRoute(async (req, { auth }) => {
  let boost = false;
  try {
    const body = await req.json();
    boost = Boolean(body?.boost);
  } catch {
    // No body or invalid JSON — defaults apply
  }

  try {
    const result = await generatePromptsFromFeeds(auth.userId, { boost });
    if (!result.ok) return resultResponse(result);
    return NextResponse.json(result.data);
  } catch (error) {
    logServerError("prompts-generate", error, { route: "/api/prompts/generate", userId: auth.userId });
    return internalError();
  }
}, {
  route: "/api/prompts/generate",
});
