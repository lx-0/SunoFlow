import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createSunoWebhookRoute } from "./suno-route";

const mockError = vi.fn();
const mockParseSunoWebhookRequest = vi.fn();
const mockProcessSunoWebhook = vi.fn();
const mockWebhookAck = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mockError(...args),
  },
}));

vi.mock("@/lib/webhooks/suno-request", () => ({
  parseSunoWebhookRequest: (...args: unknown[]) => mockParseSunoWebhookRequest(...args),
}));

vi.mock("@/lib/webhooks/suno-handler", () => ({
  processSunoWebhook: (...args: unknown[]) => mockProcessSunoWebhook(...args),
}));

vi.mock("@/lib/webhooks/ack", () => ({
  webhookAck: (...args: unknown[]) => mockWebhookAck(...args),
}));

describe("createSunoWebhookRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebhookAck.mockImplementation((options?: Record<string, unknown>) => new Response(
      JSON.stringify({ received: true, ...(options ?? {}) }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));
  });

  it("returns parse response when webhook request is invalid", async () => {
    const invalidResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    mockParseSunoWebhookRequest.mockResolvedValue({ ok: false, response: invalidResponse });

    const handler = createSunoWebhookRoute({ secret: "secret", routeTag: "/api/webhooks/suno" });
    const response = await handler(new Request("http://localhost/api/webhooks/suno") as NextRequest);

    expect(response.status).toBe(401);
    expect(mockProcessSunoWebhook).not.toHaveBeenCalled();
  });

  it("returns matched=false ack when no matching song is found", async () => {
    mockParseSunoWebhookRequest.mockResolvedValue({
      ok: true,
      taskId: "task-1",
      status: "SUCCESS",
      payload: { data: { taskId: "task-1", status: "SUCCESS" } },
    });
    mockProcessSunoWebhook.mockResolvedValue({ kind: "not_found" });

    const handler = createSunoWebhookRoute({ secret: "secret", routeTag: "/api/webhooks/suno" });
    const response = await handler(new Request("http://localhost/api/webhooks/suno") as NextRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, matched: false });
  });

  it("returns duplicate ack when callback is duplicate", async () => {
    mockParseSunoWebhookRequest.mockResolvedValue({
      ok: true,
      taskId: "task-2",
      status: "SUCCESS",
      payload: { data: { taskId: "task-2", status: "SUCCESS" } },
    });
    mockProcessSunoWebhook.mockResolvedValue({ kind: "duplicate" });

    const handler = createSunoWebhookRoute({ secret: "secret", routeTag: "/api/webhooks/suno" });
    const response = await handler(new Request("http://localhost/api/webhooks/suno") as NextRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
  });

  it("returns default ack when callback is processed", async () => {
    mockParseSunoWebhookRequest.mockResolvedValue({
      ok: true,
      taskId: "task-3",
      status: "SUCCESS",
      payload: { data: { taskId: "task-3", status: "SUCCESS" } },
    });
    mockProcessSunoWebhook.mockResolvedValue({ kind: "processed" });

    const handler = createSunoWebhookRoute({ secret: "secret", routeTag: "/api/webhooks/suno" });
    const response = await handler(new Request("http://localhost/api/webhooks/suno") as NextRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
  });

  it("returns 500 and logs when processing throws", async () => {
    mockParseSunoWebhookRequest.mockResolvedValue({
      ok: true,
      taskId: "task-4",
      status: "SUCCESS",
      payload: { data: { taskId: "task-4", status: "SUCCESS" } },
    });
    mockProcessSunoWebhook.mockRejectedValue(new Error("boom"));

    const handler = createSunoWebhookRoute({ secret: "secret", routeTag: "/api/webhooks/suno" });
    const response = await handler(new Request("http://localhost/api/webhooks/suno") as NextRequest);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal error" });
    expect(mockError).toHaveBeenCalledTimes(1);
  });
});
