import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerAllJobs } from "@/lib/jobs";
import { registerJob } from "@/lib/scheduler";

vi.mock("@/lib/scheduler", () => ({
  registerJob: vi.fn(),
}));

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe("registerAllJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers all jobs with the expected schedules and staleness thresholds", () => {
    registerAllJobs();

    const expected: [string, string, number][] = [
      ["smart-playlist-refresh", "0 3 * * *", 26 * HOUR_MS],
      ["email-digest-send", "0 8 * * 1", 8 * DAY_MS],
      ["analytics-aggregation", "0 * * * *", 2 * HOUR_MS],
      ["session-cleanup", "0 2 * * *", 26 * HOUR_MS],
      ["rate-limit-cleanup", "30 2 * * *", 26 * HOUR_MS],
      ["retention-cleanup", "45 2 * * *", 26 * HOUR_MS],
      ["feed-auto-generate", "5 * * * *", 2 * HOUR_MS],
      ["generate-embeddings", "*/15 * * * *", 1 * HOUR_MS],
      ["file-cache-eviction", "15 * * * *", 2 * HOUR_MS],
    ];

    expect(vi.mocked(registerJob)).toHaveBeenCalledTimes(expected.length);
    expected.forEach(([name, cron, expectedMaxAgeMs], i) => {
      expect(vi.mocked(registerJob)).toHaveBeenNthCalledWith(
        i + 1,
        name,
        cron,
        expect.any(Function),
        { expectedMaxAgeMs }
      );
    });
  });
});
