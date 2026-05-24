import { describe, expect, it } from "vitest";
import { processNextResultToResponse } from "./http";

describe("processNextResultToResponse", () => {
  it("maps empty outcome to 200 queue-empty response", async () => {
    const response = processNextResultToResponse({ outcome: "empty" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Queue empty", item: null });
  });

  it("maps created outcome to 201 with status projection", async () => {
    const response = processNextResultToResponse({
      outcome: "created",
      queueItem: {
        id: "q1",
        userId: "u1",
        prompt: "p",
        title: null,
        tags: null,
        makeInstrumental: false,
        personaId: null,
        position: 0,
        status: "processing",
        songId: null,
        errorMessage: null,
      } as never,
      queueStatus: "done",
      song: {
        id: "s1",
      } as never,
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      item: { id: "q1", status: "done", songId: "s1" },
      song: { id: "s1" },
    });
  });

  it("maps rate_limited outcome to 429 with reset metadata", async () => {
    const response = processNextResultToResponse({
      outcome: "rate_limited",
      rateLimit: {
        limit: 10,
        remaining: 0,
        resetAt: "2026-05-24T00:00:00.000Z",
      },
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: "Rate limit exceeded. Resets at 2026-05-24T00:00:00.000Z",
      details: { rateLimit: { remaining: 0 } },
    });
  });

  it("maps failed outcome to 201 with projected failure payload", async () => {
    const response = processNextResultToResponse({
      outcome: "failed",
      queueItem: {
        id: "q2",
        userId: "u1",
        prompt: "p",
        title: null,
        tags: null,
        makeInstrumental: false,
        personaId: null,
        position: 0,
        status: "processing",
        songId: null,
        errorMessage: null,
      } as never,
      song: { id: "s2" } as never,
      error: "upstream failure",
      code: "UPSTREAM",
      correlationId: "corr-1",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      item: { id: "q2", status: "failed", songId: "s2", errorMessage: "upstream failure" },
      song: { id: "s2" },
      error: "upstream failure",
      code: "UPSTREAM",
      correlationId: "corr-1",
    });
  });
});
