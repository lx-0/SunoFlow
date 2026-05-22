import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_RETENTION = process.env.PLAY_HISTORY_RETENTION;

async function loadHistoryModule() {
  vi.resetModules();
  return import("./index");
}

describe("buildPlayHistoryWhere", () => {
  beforeEach(() => {
    delete process.env.PLAY_HISTORY_RETENTION;
  });

  afterEach(() => {
    if (ORIGINAL_RETENTION === undefined) {
      delete process.env.PLAY_HISTORY_RETENTION;
    } else {
      process.env.PLAY_HISTORY_RETENTION = ORIGINAL_RETENTION;
    }
  });

  it("returns default retention cutoff when no date filters are provided", async () => {
    const { buildPlayHistoryWhere } = await loadHistoryModule();
    expect(
      buildPlayHistoryWhere(
        "user-1",
        {},
        new Date("2026-05-20T00:00:00.000Z"),
      ),
    ).toEqual({
      userId: "user-1",
      playedAt: { gte: new Date("2026-03-31T00:00:00.000Z") },
    });
  });

  it("applies dateFrom/dateTo when provided", async () => {
    const { buildPlayHistoryWhere } = await loadHistoryModule();
    expect(
      buildPlayHistoryWhere(
        "user-1",
        {
          dateFrom: "2026-05-01",
          dateTo: "2026-05-03",
        },
        new Date("2026-05-20T00:00:00.000Z"),
      ),
    ).toEqual({
      userId: "user-1",
      playedAt: {
        gte: new Date("2026-05-01"),
        lte: new Date("2026-05-03T23:59:59.999Z"),
      },
    });
  });

  it("ignores invalid date inputs", async () => {
    const { buildPlayHistoryWhere } = await loadHistoryModule();
    expect(
      buildPlayHistoryWhere(
        "user-1",
        {
          dateFrom: "bad",
          dateTo: "still-bad",
        },
        new Date("2026-05-20T00:00:00.000Z"),
      ),
    ).toEqual({
      userId: "user-1",
      playedAt: { gte: new Date("2026-03-31T00:00:00.000Z") },
    });
  });

  it("merges retention cutoff with dateFrom by taking the later date", async () => {
    process.env.PLAY_HISTORY_RETENTION = "30";
    const { buildPlayHistoryWhere } = await loadHistoryModule();

    const now = new Date("2026-05-20T00:00:00.000Z");
    const where = buildPlayHistoryWhere(
      "user-1",
      { dateFrom: "2026-03-01" },
      now,
    );

    expect(where).toEqual({
      userId: "user-1",
      playedAt: {
        gte: new Date("2026-04-20T00:00:00.000Z"),
      },
    });
  });

  it("treats PLAY_HISTORY_RETENTION=0 as unlimited", async () => {
    process.env.PLAY_HISTORY_RETENTION = "0";
    const { buildPlayHistoryWhere } = await loadHistoryModule();

    expect(
      buildPlayHistoryWhere(
        "user-1",
        {},
        new Date("2026-05-20T00:00:00.000Z"),
      ),
    ).toEqual({ userId: "user-1" });
  });
});
