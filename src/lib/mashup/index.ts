import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMashup } from "@/lib/sunoapi";
import { resolveUserApiKey } from "@/lib/sunoapi/resolve-key";
import { canUseFeature, type SubscriptionTier } from "@/lib/feature-gates";
import { executeGeneration, type GenerationOutcome } from "@/lib/generation";
import { resolveTrackUrl, type TrackSource } from "./tracks";

export type { TrackSource } from "./tracks";

export interface MashupSpec {
  userId: string;
  trackA: TrackSource;
  trackB: TrackSource;
  title?: string;
  prompt?: string;
  style?: string;
  instrumental?: boolean;
}

export type MashupOutcome = GenerationOutcome;

export async function executeMashup(spec: MashupSpec): Promise<MashupOutcome> {
  const { userId, trackA, trackB, title, prompt, style, instrumental } = spec;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true },
  });
  const tier: SubscriptionTier =
    (subscription?.tier as SubscriptionTier) ?? "free";

  if (!canUseFeature("mashupStudio", tier)) {
    return {
      status: "denied",
      response: NextResponse.json(
        {
          error: "Mashup Studio requires Starter tier or higher",
          code: "FORBIDDEN",
        },
        { status: 403 },
      ),
    };
  }

  const userApiKey = await resolveUserApiKey(userId);
  const hasApiKey = !!(userApiKey || process.env.SUNOAPI_KEY);

  if (!hasApiKey) {
    return {
      status: "denied",
      response: NextResponse.json(
        {
          error:
            "No API key configured. Set your API key in Settings or contact an admin.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      ),
    };
  }

  return executeGeneration({
    userId,
    action: "mashup",
    songParams: {
      title: title?.trim() || "Mashup",
      prompt: prompt?.trim() || "Mashup",
      tags: style?.trim() || null,
      isInstrumental: Boolean(instrumental),
      parentSongId: trackA.songId || trackB.songId || null,
    },
    hasApiKey: true,
    mockFallback: {},
    guards: "free",
    description: `Mashup generation: ${title?.trim() || "Mashup"}`,
    apiCall: async () => {
      const [urlA, urlB] = await Promise.all([
        resolveTrackUrl(trackA, userId, userApiKey),
        resolveTrackUrl(trackB, userId, userApiKey),
      ]);
      return generateMashup(
        {
          uploadUrlList: [urlA, urlB],
          customMode: !!(prompt || style),
          instrumental:
            instrumental != null ? Boolean(instrumental) : undefined,
          prompt: prompt?.trim() || undefined,
          style: style?.trim() || undefined,
          title: title?.trim() || undefined,
        },
        userApiKey,
      );
    },
  });
}
