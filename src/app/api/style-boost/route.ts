import { z } from "zod";
import { NextResponse } from "next/server";
import { serviceUnavailable } from "@/lib/api-error";
import { authRoute } from "@/lib/route-handler";
import { boostStyle } from "@/lib/sunoapi";
import { handleSunoRouteError, withRequiredSunoApiKey } from "@/lib/suno-route";

const bodySchema = z.object({
  content: z.string()
    .trim()
    .min(1, "A style description is required")
    .max(500, "Style description must be 500 characters or less"),
});

export const POST = authRoute(async (_request, { auth, body }) => {
  try {
    return await withRequiredSunoApiKey(auth.userId, async (apiKey) => {
      const result = await boostStyle(body.content, apiKey);
      return NextResponse.json({
        result: result.result,
        creditsConsumed: result.creditsConsumed,
        creditsRemaining: result.creditsRemaining,
      });
    });
  } catch (error) {
    return handleSunoRouteError(error, {
      logLabel: "style-boost-api",
      route: "/api/style-boost",
      mapOptions: {
        fallbackMessage: "Style boost failed. Please try again.",
      },
      transformMappedResponse: (response) => {
        if (response.status === 503) {
          return serviceUnavailable("Style boost failed. Please try again.");
        }
        return response;
      },
    });
  }
}, {
  route: "/api/style-boost",
  body: bodySchema,
});
