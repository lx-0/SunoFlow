import { SUNO_WEBHOOK_SECRET } from "@/lib/env";
import { publicRoute } from "@/lib/route-handler";
import { createSunoWebhookRoute } from "@/lib/webhooks/suno-route";

export const dynamic = "force-dynamic";

export const POST = publicRoute(
  createSunoWebhookRoute({
    secret: SUNO_WEBHOOK_SECRET,
    routeTag: "/api/webhooks/suno",
  }),
  { route: "/api/webhooks/suno" },
);
