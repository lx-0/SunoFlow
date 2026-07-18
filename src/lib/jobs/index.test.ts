import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerAllJobs } from "@/lib/jobs";
import { registerJob } from "@/lib/scheduler";

vi.mock("@/lib/scheduler", () => ({
  registerJob: vi.fn(),
}));

describe("registerAllJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers all jobs with the expected schedules", () => {
    registerAllJobs();

    expect(vi.mocked(registerJob)).toHaveBeenCalledTimes(6);
    expect(vi.mocked(registerJob)).toHaveBeenNthCalledWith(
      1,
      "smart-playlist-refresh",
      "0 3 * * *",
      expect.any(Function)
    );
    expect(vi.mocked(registerJob)).toHaveBeenNthCalledWith(
      2,
      "email-digest-send",
      "0 8 * * 1",
      expect.any(Function)
    );
    expect(vi.mocked(registerJob)).toHaveBeenNthCalledWith(
      3,
      "analytics-aggregation",
      "0 * * * *",
      expect.any(Function)
    );
    expect(vi.mocked(registerJob)).toHaveBeenNthCalledWith(
      4,
      "session-cleanup",
      "0 2 * * *",
      expect.any(Function)
    );
    expect(vi.mocked(registerJob)).toHaveBeenNthCalledWith(
      5,
      "rate-limit-cleanup",
      "30 2 * * *",
      expect.any(Function)
    );
    expect(vi.mocked(registerJob)).toHaveBeenNthCalledWith(
      6,
      "retention-cleanup",
      "45 2 * * *",
      expect.any(Function)
    );
  });
});
