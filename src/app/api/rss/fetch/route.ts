import { NextResponse } from "next/server";
import { z } from "zod";
import { authRoute } from "@/lib/route-handler";
import { fetchFeed } from "@/lib/rss";
import { isSsrfUrlResolved } from "@/lib/rss/ssrf";
import { acquireRateLimitSlot } from "@/lib/rate-limit";
import { badRequest, rateLimited } from "@/lib/api-error";

const RSS_RATE_LIMIT = 20;
const MINUTE_MS = 60_000;

const fetchFeedsBody = z.object({
  urls: z.array(z.string()).min(1, "urls array required"),
});

export const POST = authRoute(async (_req, { auth, body }) => {
  const { userId, isAdmin } = auth;

  if (!isAdmin) {
    const { acquired, status } = await acquireRateLimitSlot(userId, "rss_fetch", RSS_RATE_LIMIT, MINUTE_MS);
    if (!acquired) {
      return rateLimited(
        `Rate limit exceeded. You can fetch up to ${RSS_RATE_LIMIT} RSS requests per minute.`,
        { rateLimit: status }
      );
    }
  }
  // DNS-aware SSRF guard: https-only, default-port-only, and every candidate's
  // resolved IP(s) must be public (blocks numeric/encoded IPs + names that
  // resolve into private space).
  const checked = await Promise.all(
    body.urls.map(async (u) => ((await isSsrfUrlResolved(u)) ? null : u))
  );
  const validUrls = checked
    .filter((u): u is string => u !== null)
    .slice(0, 10);

  if (validUrls.length === 0) {
    return badRequest("No valid URLs provided");
  }

  const feeds = await Promise.all(validUrls.map(fetchFeed));
  return NextResponse.json({ feeds });
}, { route: "/api/rss/fetch", body: fetchFeedsBody });
