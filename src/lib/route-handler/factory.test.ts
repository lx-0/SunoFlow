import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPreflightRequestRoute,
  createPreflightRoute,
} from "@/lib/route-handler/factory";

const runRoutePipelineMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/route-pipeline/runner", () => ({
  runRoutePipeline: runRoutePipelineMock,
}));

describe("route-handler/factory", () => {
  beforeEach(() => {
    runRoutePipelineMock.mockReset();
  });

  it("createPreflightRoute returns preflight error without running pipeline", async () => {
    const denied = new Response("denied", { status: 401 });

    const route = createPreflightRoute(
      {
        preflight: vi.fn(async () => ({ ok: false as const, error: denied })),
        toHandlerContext: vi.fn(),
        logLabel: "test-route",
        getLogContext: vi.fn(),
      },
      vi.fn(),
    );

    const response = await route(new NextRequest("http://localhost/api/test"), {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response).toBe(denied);
    expect(runRoutePipelineMock).not.toHaveBeenCalled();
  });

  it("createPreflightRoute runs pipeline with preflight context", async () => {
    const context = { userId: "u1" };
    const expectedResponse = new Response(null, { status: 204 });

    runRoutePipelineMock.mockImplementation(async (_req, _seg, _opt, _label, _logCtx, execute) =>
      execute({ params: { id: "123" }, body: undefined, query: undefined }),
    );

    const route = createPreflightRoute(
      {
        preflight: vi.fn(async () => ({ ok: true as const, context })),
        toHandlerContext: vi.fn((ctx, parsed) => ({ auth: ctx, ...parsed })),
        logLabel: "test-route",
        getLogContext: vi.fn((ctx) => ({ userId: ctx.userId })),
      },
      vi.fn(async () => expectedResponse),
    );

    const response = await route(new NextRequest("http://localhost/api/test"), {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response).toBe(expectedResponse);
    expect(runRoutePipelineMock).toHaveBeenCalledOnce();
    const call = runRoutePipelineMock.mock.calls[0];
    expect(call[3]).toBe("test-route");
    expect(call[4]).toEqual({ userId: "u1" });
  });

  it("createPreflightRequestRoute returns preflight error without running pipeline", async () => {
    const denied = new Response("denied", { status: 403 });

    const route = createPreflightRequestRoute(
      {
        preflight: vi.fn(async () => ({ ok: false as const, error: denied })),
        logLabel: "test-request-route",
        getLogContext: vi.fn(),
      },
      vi.fn(),
    );

    const response = await route(new NextRequest("http://localhost/api/test"));

    expect(response).toBe(denied);
    expect(runRoutePipelineMock).not.toHaveBeenCalled();
  });

  it("createPreflightRequestRoute runs pipeline and handler", async () => {
    const context = { adminId: "a1" };
    const expectedResponse = new Response(null, { status: 200 });

    runRoutePipelineMock.mockImplementation(async (_req, _seg, _opt, _label, _logCtx, execute) =>
      execute({ params: {}, body: undefined, query: undefined }),
    );

    const handler = vi.fn(async () => expectedResponse);
    const route = createPreflightRequestRoute(
      {
        preflight: vi.fn(async () => ({ ok: true as const, context })),
        logLabel: "test-request-route",
        getLogContext: vi.fn((ctx) => ({ adminId: ctx.adminId })),
      },
      handler,
    );

    const response = await route(new NextRequest("http://localhost/api/test"));

    expect(response).toBe(expectedResponse);
    expect(runRoutePipelineMock).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(expect.any(NextRequest), context);
  });
});
