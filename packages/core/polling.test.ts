import { describe, it, expect } from "vitest";
import { runGenerationPoll, type GenerationPollResult } from "./polling";

// Status shape mirrors the mobile pollStatus response the screens consume.
interface Status {
  ready: boolean;
  failed: boolean;
  errorMessage?: string;
}

const processing: Status = { ready: false, failed: false };
const ready: Status = { ready: true, failed: false };
const failed = (errorMessage?: string): Status => ({ ready: false, failed: true, errorMessage });

type PollStep = { status: Status } | { error: unknown };

interface Case {
  name: string;
  maxPolls: number;
  /** Scripted outcome per poll call; the loop must not poll past the script. */
  steps: PollStep[];
  /**
   * When set, isAlive turns false permanently at the given check of the given
   * 0-based attempt — pre-sleep or post-sleep — modelling an unmount.
   */
  abort?: { attempt: number; at: "pre-sleep" | "post-sleep" };
  expected: GenerationPollResult<Status>;
  expectedPolls: number;
  expectedSleeps: number;
  expectedPollErrors?: number;
}

const cases: Case[] = [
  {
    name: "ready on the first attempt",
    maxPolls: 5,
    steps: [{ status: ready }],
    expected: { kind: "ready", status: ready },
    expectedPolls: 1,
    expectedSleeps: 1,
  },
  {
    name: "ready on attempt 3 after processing",
    maxPolls: 5,
    steps: [{ status: processing }, { status: processing }, { status: ready }],
    expected: { kind: "ready", status: ready },
    expectedPolls: 3,
    expectedSleeps: 3,
  },
  {
    name: "failed with a message",
    maxPolls: 5,
    steps: [{ status: processing }, { status: failed("boom") }],
    expected: { kind: "failed", errorMessage: "boom" },
    expectedPolls: 2,
    expectedSleeps: 2,
  },
  {
    name: "failed without a message",
    maxPolls: 5,
    steps: [{ status: failed() }],
    expected: { kind: "failed", errorMessage: undefined },
    expectedPolls: 1,
    expectedSleeps: 1,
  },
  {
    name: "transient poll error then ready",
    maxPolls: 5,
    steps: [{ error: new Error("network") }, { status: ready }],
    expected: { kind: "ready", status: ready },
    expectedPolls: 2,
    expectedSleeps: 2,
    expectedPollErrors: 1,
  },
  {
    name: "abort pre-sleep: no sleep, no poll",
    maxPolls: 5,
    steps: [],
    abort: { attempt: 0, at: "pre-sleep" },
    expected: { kind: "aborted" },
    expectedPolls: 0,
    expectedSleeps: 0,
  },
  {
    name: "abort post-sleep (upload.tsx regression): slept but never polled",
    maxPolls: 5,
    steps: [],
    abort: { attempt: 0, at: "post-sleep" },
    expected: { kind: "aborted" },
    expectedPolls: 0,
    expectedSleeps: 1,
  },
  {
    name: "abort post-sleep on a later attempt",
    maxPolls: 5,
    steps: [{ status: processing }],
    abort: { attempt: 1, at: "post-sleep" },
    expected: { kind: "aborted" },
    expectedPolls: 1,
    expectedSleeps: 2,
  },
  {
    name: "timeout after maxPolls non-terminal statuses",
    maxPolls: 3,
    steps: [{ status: processing }, { status: processing }, { status: processing }],
    expected: { kind: "timeout" },
    expectedPolls: 3,
    expectedSleeps: 3,
  },
  {
    name: "poll errors consume attempts and end in timeout",
    maxPolls: 2,
    steps: [{ error: new Error("a") }, { error: new Error("b") }],
    expected: { kind: "timeout" },
    expectedPolls: 2,
    expectedSleeps: 2,
    expectedPollErrors: 2,
  },
];

describe("runGenerationPoll", () => {
  it.each(cases)("$name", async ({ maxPolls, steps, abort, expected, expectedPolls, expectedSleeps, expectedPollErrors = 0 }) => {
    let pollCalls = 0;
    let sleepCalls = 0;
    let aliveChecks = 0;
    const pollErrors: unknown[] = [];
    // isAlive call order is pre(0), post(0), pre(1), post(1)…: check index
    // 2*attempt is pre-sleep, 2*attempt+1 is post-sleep of that attempt.
    const abortFromCheck = abort === undefined ? Infinity : abort.attempt * 2 + (abort.at === "post-sleep" ? 1 : 0);

    const result = await runGenerationPoll(
      async () => {
        const step = steps[pollCalls++];
        if (step === undefined) throw new Error("polled past the scripted steps");
        if ("error" in step) throw step.error;
        return step.status;
      },
      {
        intervalMs: 700,
        maxPolls,
        sleep: async (ms) => {
          expect(ms).toBe(700);
          sleepCalls++;
        },
        isAlive: () => aliveChecks++ < abortFromCheck,
        isReady: (s) => s.ready,
        isFailed: (s) => s.failed,
        failMessage: (s) => s.errorMessage,
        onPollError: (e) => pollErrors.push(e),
      },
    );

    expect(result).toEqual(expected);
    expect(pollCalls).toBe(expectedPolls);
    expect(sleepCalls).toBe(expectedSleeps);
    expect(pollErrors).toHaveLength(expectedPollErrors);
  });

  it("defaults to a real setTimeout sleep when none is injected", async () => {
    const result = await runGenerationPoll(async () => ready, {
      intervalMs: 1,
      maxPolls: 1,
      isAlive: () => true,
      isReady: (s: Status) => s.ready,
      isFailed: (s: Status) => s.failed,
    });
    expect(result).toEqual({ kind: "ready", status: ready });
  });
});
