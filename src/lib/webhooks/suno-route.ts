import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { parseSunoWebhookRequest } from "@/lib/webhooks/suno-request";
import { processSunoWebhook } from "@/lib/webhooks/suno-handler";
import { webhookAck } from "@/lib/webhooks/ack";

type CreateSunoWebhookRouteOptions = {
  secret?: string;
  routeTag: string;
};

export function createSunoWebhookRoute(options: CreateSunoWebhookRouteOptions) {
  return async function POST(request: NextRequest) {
    const parsed = await parseSunoWebhookRequest(request, { secret: options.secret });
    if (!parsed.ok) {
      return parsed.response;
    }

    try {
      const result = await processSunoWebhook(parsed);
      if (result.kind === "not_found") return webhookAck({ matched: false });
      if (result.kind === "duplicate") return webhookAck({ duplicate: true });
    } catch (error) {
      logger.error(
        { err: error, route: options.routeTag, taskId: parsed.taskId },
        "suno-webhook: error processing callback",
      );
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    return webhookAck();
  };
}
